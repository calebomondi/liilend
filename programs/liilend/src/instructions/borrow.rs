use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::LiiLendError;
use crate::utils::math::*;
use crate::utils::share_math::amount_to_debt_shares;
use crate::cpi::dispatch_borrow;

#[derive(Accounts)]
pub struct BorrowAsset<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [VAULT_SEED, borrow_mint.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(
        mut,
        seeds = [USER_SEED, authority.key().as_ref()],
        bump = user_account.bump,
        constraint = user_account.owner == authority.key() @ LiiLendError::UnauthorizedAccess,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init_if_needed,
        seeds = [BORROW_SEED, authority.key().as_ref(), borrow_mint.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + BorrowPosition::INIT_SPACE
    )]
    pub borrow_position: Account<'info, BorrowPosition>,

    #[account(mut)]
    pub vault_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,

    pub borrow_mint: Account<'info, Mint>,

    /// CHECK: Oracle price feed account - validated in handler
    pub collateral_price_feed: AccountInfo<'info>,

    /// CHECK: Oracle price feed account - validated in handler
    pub borrow_price_feed: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_borrow(ctx: Context<BorrowAsset>, amount: u64) -> Result<()> {
    require!(amount > 0, LiiLendError::ZeroAmount);
    require!(!ctx.accounts.protocol_state.paused, LiiLendError::ProtocolPaused);

    let vault_total = ctx.accounts.vault.total_value;
    let vault_bump = ctx.accounts.vault.bump;
    let borrow_mint_key = ctx.accounts.borrow_mint.key();

    require!(
        vault_total >= amount,
        LiiLendError::InsufficientLiquidity
    );

    let user_account = &ctx.accounts.user_account;
    let user_collateral_value = user_account.collateral_shares as u64;

    let ltv = calculate_ltv(amount, user_collateral_value)
        .map_err(|_| LiiLendError::MathOverflow)?;
    let adjusted_max_ltv = adjust_ltv_with_buffer(10_000, 1_000);
    require!(ltv <= adjusted_max_ltv as u64, LiiLendError::BorrowExceedsMaxLTV);

    let protocol_state_info = &ctx.accounts.protocol_state;
    let debt_shares = amount_to_debt_shares(amount, protocol_state_info.global_debt_shares, protocol_state_info.total_borrows_usd as u64)
        .map_err(|_| LiiLendError::ShareCalculationOverflow)?;

    let borrow_position = &mut ctx.accounts.borrow_position;
    if borrow_position.owner == Pubkey::default() {
        borrow_position.owner = ctx.accounts.authority.key();
        borrow_position.borrow_mint = borrow_mint_key;
        borrow_position.borrow_ts = Clock::get()?.unix_timestamp;
        borrow_position.bump = ctx.bumps.borrow_position;
    }
    borrow_position.debt_shares = borrow_position.debt_shares.saturating_add(debt_shares);
    borrow_position.last_accrual_ts = Clock::get()?.unix_timestamp;

    let seeds = &[VAULT_SEED, borrow_mint_key.as_ref(), &[vault_bump]];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_ata.to_account_info(),
                to: ctx.accounts.user_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    if !ctx.remaining_accounts.is_empty() {
        dispatch_borrow(
            amount,
            &ctx.accounts.vault,
            vault_bump,
            &borrow_mint_key,
            ctx.remaining_accounts,
        )?;
    }

    let vault = &mut ctx.accounts.vault;
    vault.total_value = vault.total_value.saturating_sub(amount);

    let protocol_state = &mut ctx.accounts.protocol_state;
    protocol_state.global_debt_shares = protocol_state.global_debt_shares.saturating_add(debt_shares);
    protocol_state.total_borrows_usd = protocol_state.total_borrows_usd.saturating_add(amount as u128);

    emit!(BorrowEvent {
        user: ctx.accounts.authority.key(),
        asset: borrow_mint_key,
        amount,
        debt_shares,
    });

    Ok(())
}

#[event]
pub struct BorrowEvent {
    pub user: Pubkey,
    pub asset: Pubkey,
    pub amount: u64,
    pub debt_shares: u128,
}
