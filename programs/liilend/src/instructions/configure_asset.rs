use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::state::*;
use crate::errors::LiiLendError;

#[derive(Accounts)]
#[instruction(asset_index: u8)]
pub struct ConfigureAsset<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
        constraint = protocol_state.authority == authority.key() @ LiiLendError::UnauthorizedAccess
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        init,
        seeds = [VAULT_SEED, mint.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + VaultAccount::INIT_SPACE
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(
        init,
        seeds = [PRICE_FEED_SEED, mint.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + PriceFeed::INIT_SPACE
    )]
    pub price_feed: Account<'info, PriceFeed>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_configure_asset(
    ctx: Context<ConfigureAsset>,
    _asset_index: u8,
    _asset_type: AssetType,
    max_ltv_bps: u16,
    liquidation_threshold_bps: u16,
    _liquidation_penalty_bps: u16,
    _reserve_factor_bps: u16,
    _deposit_cap: u64,
    _borrow_cap: u64,
    _oracle_source: OracleSource,
    _pyth_price_feed: Pubkey,
    _switchboard_price_feed: Pubkey,
) -> Result<()> {
    require!(!ctx.accounts.protocol_state.paused, LiiLendError::ProtocolPaused);
    require!(max_ltv_bps < liquidation_threshold_bps, LiiLendError::InvalidFeeConfig);
    require!(liquidation_threshold_bps <= 10_000, LiiLendError::InvalidFeeConfig);

    let vault = &mut ctx.accounts.vault;
    vault.asset_mint = ctx.accounts.mint.key();
    vault.total_shares = 0;
    vault.total_value = 0;
    vault.protocol_integration = ProtocolIntegration::MarginFi;
    vault.integrated_protocol_market = Pubkey::default();
    vault.lp_token_account = Pubkey::default();
    vault.yield_accrued = 0;
    vault.last_yield_update_ts = Clock::get()?.unix_timestamp;
    vault.bump = ctx.bumps.vault;

    let price_feed = &mut ctx.accounts.price_feed;
    price_feed.asset_mint = ctx.accounts.mint.key();
    price_feed.price = 0;
    price_feed.decimals = 0;
    price_feed.confidence = 0;
    price_feed.ema_price = 0;
    price_feed.last_update_ts = 0;
    price_feed.oracle_source = OracleSource::Pyth;
    price_feed.is_valid = false;
    price_feed.bump = ctx.bumps.price_feed;

    ctx.accounts.protocol_state.asset_count = ctx.accounts.protocol_state.asset_count.saturating_add(1);

    emit!(AssetConfigured {
        mint: ctx.accounts.mint.key(),
        asset_type: _asset_type,
        max_ltv_bps,
        liquidation_threshold_bps,
    });

    Ok(())
}

#[event]
pub struct AssetConfigured {
    pub mint: Pubkey,
    pub asset_type: AssetType,
    pub max_ltv_bps: u16,
    pub liquidation_threshold_bps: u16,
}
