use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitProtocol<'info> {
    #[account(
        init,
        seeds = [PROTOCOL_SEED],
        bump,
        payer = payer,
        space = 8 + ProtocolState::INIT_SPACE
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        init,
        seeds = [TREASURY_SEED],
        bump,
        payer = payer,
        space = 8 + TreasuryAccount::INIT_SPACE
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub authority: Signer<'info>,
}

pub fn handle_init_protocol(ctx: Context<InitProtocol>) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol_state;
    protocol.authority = ctx.accounts.authority.key();
    protocol.proposed_authority = Pubkey::default();
    protocol.treasury = ctx.accounts.treasury.key();
    protocol.fee_authority = ctx.accounts.authority.key();
    protocol.paused = false;
    protocol.global_deposit_shares = 0;
    protocol.global_debt_shares = 0;
    protocol.total_deposits_usd = 0;
    protocol.total_borrows_usd = 0;
    protocol.protocol_fees_accrued = 0;
    protocol.last_update_ts = Clock::get()?.unix_timestamp;
    protocol.bump = ctx.bumps.protocol_state;

    let treasury = &mut ctx.accounts.treasury;
    treasury.treasury_bump = ctx.bumps.treasury;
    treasury.fee_accumulator = 0;
    treasury.insurance_fund = 0;
    treasury.spread_revenue = 0;
    treasury.liquidation_fees = 0;

    Ok(())
}
