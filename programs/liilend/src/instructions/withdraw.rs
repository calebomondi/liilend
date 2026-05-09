use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::LiiLendError;
use crate::utils::share_math::shares_to_amount;

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
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
        mut,
        seeds = [USER_SEED, authority.key().as_ref(), asset_mint.key().as_ref()],
        bump = user_collateral.bump,
        constraint = user_collateral.owner == authority.key() @ LiiLendError::UnauthorizedAccess,
    )]
    pub user_collateral: Account<'info, UserCollateralAccount>,

    #[account(
        mut,
        seeds = [USER_SEED, authority.key().as_ref()],
        bump = user_account.bump,
        constraint = user_account.owner == authority.key() @ LiiLendError::UnauthorizedAccess,
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

pub fn handle_withdraw(ctx: Context<WithdrawCollateral>, share_amount: u128) -> Result<()> {
    require!(share_amount > 0, LiiLendError::ZeroAmount);
    require!(!ctx.accounts.protocol_state.paused, LiiLendError::ProtocolPaused);

    let user_collateral = &mut ctx.accounts.user_collateral;
    require!(
        user_collateral.shares >= share_amount,
        LiiLendError::InsufficientCollateral
    );

    let vault_info = &ctx.accounts.vault;
    let withdraw_amount = shares_to_amount(share_amount, vault_info.total_shares, vault_info.total_value)
        .map_err(|_| LiiLendError::ShareCalculationOverflow)?;

    user_collateral.shares = user_collateral.shares.saturating_sub(share_amount);

    let vault = &mut ctx.accounts.vault;
    vault.total_shares = vault.total_shares.saturating_sub(share_amount);
    vault.total_value = vault.total_value.saturating_sub(withdraw_amount);

    let user_account = &mut ctx.accounts.user_account;
    user_account.collateral_shares = user_account.collateral_shares.saturating_sub(share_amount);
    user_account.last_interaction_ts = Clock::get()?.unix_timestamp;

    let asset_mint_key = ctx.accounts.asset_mint.key();
    let vault_bump = ctx.accounts.vault.bump;
    let seeds = &[VAULT_SEED, asset_mint_key.as_ref(), &[vault_bump]];
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
        withdraw_amount,
    )?;

    emit!(WithdrawEvent {
        user: ctx.accounts.authority.key(),
        asset: ctx.accounts.asset_mint.key(),
        amount: withdraw_amount,
        shares: share_amount,
    });

    Ok(())
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub asset: Pubkey,
    pub amount: u64,
    pub shares: u128,
}
