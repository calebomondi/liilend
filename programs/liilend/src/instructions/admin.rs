use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::LiiLendError;

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
        constraint = protocol_state.authority == authority.key() @ LiiLendError::UnauthorizedAccess
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    pub authority: Signer<'info>,
}

pub fn handle_set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
    ctx.accounts.protocol_state.paused = paused;
    emit!(PausedStateChanged { paused });
    Ok(())
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
        constraint = protocol_state.authority == authority.key() @ LiiLendError::UnauthorizedAccess
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    pub authority: Signer<'info>,
    pub new_authority: Signer<'info>,
}

pub fn handle_transfer_authority(ctx: Context<TransferAuthority>) -> Result<()> {
    ctx.accounts.protocol_state.proposed_authority = ctx.accounts.new_authority.key();
    emit!(AuthorityTransferStarted {
        current: ctx.accounts.authority.key(),
        proposed: ctx.accounts.new_authority.key(),
    });
    Ok(())
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
        constraint = protocol_state.proposed_authority == authority.key() @ LiiLendError::UnauthorizedAccess
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    pub authority: Signer<'info>,
}

pub fn handle_accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
    ctx.accounts.protocol_state.authority = ctx.accounts.authority.key();
    ctx.accounts.protocol_state.proposed_authority = Pubkey::default();
    emit!(AuthorityTransferred {
        new_authority: ctx.accounts.authority.key(),
    });
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateAssetConfig<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
        constraint = protocol_state.authority == authority.key() @ LiiLendError::UnauthorizedAccess
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [PRICE_FEED_SEED, mint.key().as_ref()],
        bump = price_feed.bump,
    )]
    pub price_feed: Account<'info, PriceFeed>,

    /// CHECK: Mint account - validated through price_feed seed derivation
    pub mint: AccountInfo<'info>,
    pub authority: Signer<'info>,
}

pub fn handle_update_asset_config(
    ctx: Context<UpdateAssetConfig>,
    max_ltv_bps: u16,
    liquidation_threshold_bps: u16,
    deposit_cap: u64,
    borrow_cap: u64,
    is_active: bool,
) -> Result<()> {
    require!(!ctx.accounts.protocol_state.paused, LiiLendError::ProtocolPaused);
    ctx.accounts.price_feed.is_valid = is_active;

    emit!(AssetConfigUpdated {
        mint: ctx.accounts.mint.key(),
        max_ltv_bps,
        liquidation_threshold_bps,
        deposit_cap,
        borrow_cap,
        is_active,
    });

    Ok(())
}

#[event]
pub struct PausedStateChanged {
    pub paused: bool,
}

#[event]
pub struct AuthorityTransferStarted {
    pub current: Pubkey,
    pub proposed: Pubkey,
}

#[event]
pub struct AuthorityTransferred {
    pub new_authority: Pubkey,
}

#[event]
pub struct AssetConfigUpdated {
    pub mint: Pubkey,
    pub max_ltv_bps: u16,
    pub liquidation_threshold_bps: u16,
    pub deposit_cap: u64,
    pub borrow_cap: u64,
    pub is_active: bool,
}
