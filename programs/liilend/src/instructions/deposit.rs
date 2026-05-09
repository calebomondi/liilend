use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::LiiLendError;
use crate::utils::share_math::amount_to_shares;

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [VAULT_SEED, asset_mint.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(
        init_if_needed,
        seeds = [USER_SEED, authority.key().as_ref(), asset_mint.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + UserCollateralAccount::INIT_SPACE
    )]
    pub user_collateral: Account<'info, UserCollateralAccount>,

    #[account(
        init_if_needed,
        seeds = [USER_SEED, authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + UserAccount::INIT_SPACE
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub vault_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,

    pub asset_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_deposit(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
    require!(amount > 0, LiiLendError::ZeroAmount);
    require!(!ctx.accounts.protocol_state.paused, LiiLendError::ProtocolPaused);

    let vault = &mut ctx.accounts.vault;

    let shares = amount_to_shares(amount, vault.total_shares, vault.total_value)
        .map_err(|_| LiiLendError::ShareCalculationOverflow)?;
    require!(shares > 0, LiiLendError::ShareCalculationOverflow);

    let transfer_ix = Transfer {
        from: ctx.accounts.user_ata.to_account_info(),
        to: ctx.accounts.vault_ata.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_ix,
        ),
        amount,
    )?;

    vault.total_shares = vault.total_shares.saturating_add(shares);
    vault.total_value = vault.total_value.saturating_add(amount);
    vault.last_yield_update_ts = Clock::get()?.unix_timestamp;

    let user_collateral = &mut ctx.accounts.user_collateral;
    if user_collateral.owner == Pubkey::default() {
        user_collateral.owner = ctx.accounts.authority.key();
        user_collateral.asset_mint = ctx.accounts.asset_mint.key();
        user_collateral.bump = ctx.bumps.user_collateral;
    }
    user_collateral.shares = user_collateral.shares.saturating_add(shares);
    user_collateral.deposit_ts = Clock::get()?.unix_timestamp;

    let user_account = &mut ctx.accounts.user_account;
    if user_account.owner == Pubkey::default() {
        user_account.owner = ctx.accounts.authority.key();
        user_account.bump = ctx.bumps.user_account;
    }
    user_account.collateral_shares = user_account.collateral_shares.saturating_add(shares);
    user_account.last_interaction_ts = Clock::get()?.unix_timestamp;

    let protocol_state = &mut ctx.accounts.protocol_state;
    protocol_state.total_deposits_usd = protocol_state
        .total_deposits_usd
        .saturating_add(amount as u128);

    emit!(DepositEvent {
        user: ctx.accounts.authority.key(),
        asset: ctx.accounts.asset_mint.key(),
        amount,
        shares,
    });

    Ok(())
}

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub asset: Pubkey,
    pub amount: u64,
    pub shares: u128,
}
