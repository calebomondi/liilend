use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::LiiLendError;
use crate::utils::math::*;
use crate::utils::share_math::shares_to_amount;
use crate::utils::share_math::debt_shares_to_amount;

#[derive(Accounts)]
pub struct LiquidatePosition<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.treasury_bump,
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    #[account(
        mut,
        seeds = [VAULT_SEED, collateral_mint.key().as_ref()],
        bump = collateral_vault.bump,
    )]
    pub collateral_vault: Box<Account<'info, VaultAccount>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, borrow_mint.key().as_ref()],
        bump = borrow_vault.bump,
    )]
    pub borrow_vault: Box<Account<'info, VaultAccount>>,

    #[account(
        mut,
        seeds = [USER_SEED, liquidatee.key().as_ref()],
        bump = liquidatee_account.bump,
    )]
    pub liquidatee_account: Box<Account<'info, UserAccount>>,

    #[account(
        mut,
        seeds = [USER_SEED, liquidatee.key().as_ref(), collateral_mint.key().as_ref()],
        bump = liquidatee_collateral.bump,
    )]
    pub liquidatee_collateral: Box<Account<'info, UserCollateralAccount>>,

    #[account(
        mut,
        seeds = [BORROW_SEED, liquidatee.key().as_ref(), borrow_mint.key().as_ref()],
        bump = liquidatee_borrow.bump,
    )]
    pub liquidatee_borrow: Box<Account<'info, BorrowPosition>>,

    #[account(mut)]
    pub collateral_vault_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub borrow_vault_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub liquidator_ata: Box<Account<'info, TokenAccount>>,

    pub collateral_mint: Box<Account<'info, Mint>>,
    pub borrow_mint: Box<Account<'info, Mint>>,

    /// CHECK: The user being liquidated
    pub liquidatee: AccountInfo<'info>,

    #[account(mut)]
    pub liquidator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_liquidate(ctx: Context<LiquidatePosition>, max_debt_to_repay: u64) -> Result<()> {
    require!(max_debt_to_repay > 0, LiiLendError::ZeroAmount);
    require!(!ctx.accounts.protocol_state.paused, LiiLendError::ProtocolPaused);

    let protocol_state = &ctx.accounts.protocol_state;
    let debt_amount = debt_shares_to_amount(
        ctx.accounts.liquidatee_borrow.debt_shares,
        protocol_state.global_debt_shares,
        protocol_state.total_borrows_usd as u64,
    ).map_err(|_| LiiLendError::MathOverflow)?;

    require!(debt_amount > 0, LiiLendError::NoDebtToLiquidate);

    let collateral_value = shares_to_amount(
        ctx.accounts.liquidatee_collateral.shares,
        ctx.accounts.collateral_vault.total_shares,
        ctx.accounts.collateral_vault.total_value,
    ).map_err(|_| LiiLendError::MathOverflow)?;
    let health_factor = calculate_health_factor(
        collateral_value,
        debt_amount,
        7_500,
    ).map_err(|_| LiiLendError::MathOverflow)?;

    require!(health_factor < 1_000_000, LiiLendError::LiquidationThresholdNotReached);

    let repay_amount = std::cmp::min(max_debt_to_repay, debt_amount);
    let liquidation_reward = calculate_liquidation_amount(repay_amount, 5_00)
        .map_err(|_| LiiLendError::MathOverflow)?;

    let borrow_mint_key = ctx.accounts.borrow_mint.key();
    let borrow_vault_bump = ctx.accounts.borrow_vault.bump;
    let seeds = &[VAULT_SEED, borrow_mint_key.as_ref(), &[borrow_vault_bump]];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.borrow_vault_ata.to_account_info(),
                to: ctx.accounts.liquidator_ata.to_account_info(),
                authority: ctx.accounts.borrow_vault.to_account_info(),
            },
            signer_seeds,
        ),
        repay_amount,
    )?;

    let liquidatee_collateral = &mut ctx.accounts.liquidatee_collateral;
    let collateral_seize = std::cmp::min(liquidation_reward, liquidatee_collateral.shares as u64);
    liquidatee_collateral.shares = liquidatee_collateral.shares.saturating_sub(collateral_seize as u128);

    let repaying_debt_shares = if protocol_state.total_borrows_usd > 0 {
        (repay_amount as u128 * protocol_state.global_debt_shares) / protocol_state.total_borrows_usd
    } else {
        0
    };
    ctx.accounts.liquidatee_borrow.debt_shares = ctx.accounts.liquidatee_borrow.debt_shares.saturating_sub(repaying_debt_shares);

    let protocol_state = &mut ctx.accounts.protocol_state;
    protocol_state.global_debt_shares = protocol_state.global_debt_shares.saturating_sub(repaying_debt_shares);
    protocol_state.total_borrows_usd = protocol_state.total_borrows_usd.saturating_sub(repay_amount as u128);

    ctx.accounts.collateral_vault.total_shares = ctx.accounts.collateral_vault.total_shares.saturating_sub(collateral_seize as u128);

    let fee = repay_amount as u128 * 500 / 10_000;
    ctx.accounts.treasury.fee_accumulator = ctx.accounts.treasury.fee_accumulator.saturating_add(fee as u64);

    emit!(LiquidationEvent {
        liquidator: ctx.accounts.liquidator.key(),
        liquidatee: ctx.accounts.liquidatee.key(),
        debt_repaid: repay_amount,
        collateral_seized: collateral_seize,
    });

    Ok(())
}

#[event]
pub struct LiquidationEvent {
    pub liquidator: Pubkey,
    pub liquidatee: Pubkey,
    pub debt_repaid: u64,
    pub collateral_seized: u64,
}
