use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::LiiLendError;

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
        constraint = protocol_state.authority == authority.key() @ LiiLendError::UnauthorizedAccess,
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.treasury_bump,
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    #[account(mut)]
    pub treasury_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_ata: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
    require!(amount > 0, LiiLendError::ZeroAmount);

    let treasury = &ctx.accounts.treasury;
    let seeds = &[TREASURY_SEED, &[treasury.treasury_bump]];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury_ata.to_account_info(),
                to: ctx.accounts.recipient_ata.to_account_info(),
                authority: ctx.accounts.treasury.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    emit!(TreasuryWithdraw {
        recipient: ctx.accounts.recipient_ata.key(),
        amount,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CollectFees<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
        constraint = protocol_state.fee_authority == authority.key() @ LiiLendError::UnauthorizedAccess,
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.treasury_bump,
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn handle_collect_fees(ctx: Context<CollectFees>) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    let fees = treasury.fee_accumulator;
    treasury.fee_accumulator = 0;

    emit!(FeesCollected {
        amount: fees,
        treasury: ctx.accounts.treasury.key(),
    });

    Ok(())
}

#[event]
pub struct TreasuryWithdraw {
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct FeesCollected {
    pub amount: u64,
    pub treasury: Pubkey,
}
