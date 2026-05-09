use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::LiiLendError;
use crate::utils::share_math::debt_shares_to_amount;

#[derive(Accounts)]
pub struct RepayDebt<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [VAULT_SEED, repay_mint.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(
        mut,
        seeds = [BORROW_SEED, authority.key().as_ref(), repay_mint.key().as_ref()],
        bump = borrow_position.bump,
        constraint = borrow_position.owner == authority.key() @ LiiLendError::UnauthorizedAccess,
    )]
    pub borrow_position: Account<'info, BorrowPosition>,

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

    pub repay_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_repay(ctx: Context<RepayDebt>, amount: u64) -> Result<()> {
    require!(amount > 0, LiiLendError::ZeroAmount);
    require!(!ctx.accounts.protocol_state.paused, LiiLendError::ProtocolPaused);

    let protocol_state = &ctx.accounts.protocol_state;
    let borrow_position = &mut ctx.accounts.borrow_position;

    let debt_amount = debt_shares_to_amount(
        borrow_position.debt_shares,
        protocol_state.global_debt_shares,
        protocol_state.total_borrows_usd as u64,
    ).map_err(|_| LiiLendError::MathOverflow)?;

    require!(amount <= debt_amount, LiiLendError::RepaymentExceedsDebt);

    let repay_shares = if debt_amount > 0 {
        (amount as u128 * protocol_state.global_debt_shares) / (debt_amount as u128)
    } else {
        0
    };

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

    borrow_position.debt_shares = borrow_position.debt_shares.saturating_sub(repay_shares);

    let protocol_state = &mut ctx.accounts.protocol_state;
    protocol_state.global_debt_shares = protocol_state.global_debt_shares.saturating_sub(repay_shares);
    protocol_state.total_borrows_usd = protocol_state.total_borrows_usd.saturating_sub(amount as u128);

    let vault = &mut ctx.accounts.vault;
    vault.total_value = vault.total_value.saturating_add(amount);

    emit!(RepayEvent {
        user: ctx.accounts.authority.key(),
        asset: ctx.accounts.repay_mint.key(),
        amount,
        debt_shares: repay_shares,
    });

    Ok(())
}

#[event]
pub struct RepayEvent {
    pub user: Pubkey,
    pub asset: Pubkey,
    pub amount: u64,
    pub debt_shares: u128,
}
