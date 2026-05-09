use anchor_lang::prelude::*;

pub const PROTOCOL_SEED: &[u8] = b"liilend-protocol";
pub const VAULT_SEED: &[u8] = b"liilend-vault";
pub const USER_SEED: &[u8] = b"liilend-user";
pub const BORROW_SEED: &[u8] = b"liilend-borrow";
pub const TREASURY_SEED: &[u8] = b"liilend-treasury";
pub const RESERVE_SEED: &[u8] = b"liilend-reserve";
pub const ORACLE_SEED: &[u8] = b"liilend-oracle";
pub const PRICE_FEED_SEED: &[u8] = b"liilend-price-feed";
pub const LIQUIDATION_SEED: &[u8] = b"liilend-liquidation";

pub const MAX_ASSETS: usize = 8;
pub const MAX_PROTOCOL_INTEGRATIONS: usize = 4;
pub const PRICE_VALIDITY_SECONDS: i64 = 60;
pub const BASIS_POINTS_DIVISOR: u64 = 10_000;
pub const SHARE_DECIMALS: u8 = 9;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AssetType {
    Collateral,
    Borrowable,
    Both,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ProtocolIntegration {
    MarginFi,
    SaveFinance,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OracleSource {
    Pyth,
    Switchboard,
}

#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub proposed_authority: Pubkey,
    pub treasury: Pubkey,
    pub fee_authority: Pubkey,
    pub paused: bool,
    pub asset_count: u8,
    pub global_deposit_shares: u128,
    pub global_debt_shares: u128,
    pub total_deposits_usd: u128,
    pub total_borrows_usd: u128,
    pub protocol_fees_accrued: u64,
    pub last_update_ts: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AssetConfig {
    pub mint: Pubkey,
    pub asset_type: AssetType,
    pub decimals: u8,
    pub pyth_price_feed: Pubkey,
    pub switchboard_price_feed: Pubkey,
    pub deposit_cap: u64,
    pub borrow_cap: u64,
    pub total_deposits: u64,
    pub total_borrows: u64,
    pub max_ltv_bps: u16,
    pub liquidation_threshold_bps: u16,
    pub liquidation_penalty_bps: u16,
    pub reserve_factor_bps: u16,
    pub oracle_source: OracleSource,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VaultAccount {
    pub asset_mint: Pubkey,
    pub total_shares: u128,
    pub total_value: u64,
    pub protocol_integration: ProtocolIntegration,
    pub integrated_protocol_market: Pubkey,
    pub lp_token_account: Pubkey,
    pub yield_accrued: u64,
    pub last_yield_update_ts: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub owner: Pubkey,
    pub collateral_shares: u128,
    pub debt_shares: u128,
    pub last_interaction_ts: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserCollateralAccount {
    pub owner: Pubkey,
    pub asset_mint: Pubkey,
    pub shares: u128,
    pub deposit_ts: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BorrowPosition {
    pub owner: Pubkey,
    pub borrow_mint: Pubkey,
    pub debt_shares: u128,
    pub borrow_ts: i64,
    pub last_accrual_ts: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PriceFeed {
    pub asset_mint: Pubkey,
    pub price: u64,
    pub decimals: u8,
    pub confidence: u64,
    pub ema_price: u64,
    pub last_update_ts: i64,
    pub oracle_source: OracleSource,
    pub is_valid: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TreasuryAccount {
    pub treasury_bump: u8,
    pub fee_accumulator: u64,
    pub insurance_fund: u64,
    pub spread_revenue: u64,
    pub liquidation_fees: u64,
}

#[account]
#[derive(InitSpace)]
pub struct LiquidationQueue {
    #[max_len(50)]
    pub positions: Vec<Pubkey>,
    pub head: u64,
    pub tail: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct FiatConfig {
    pub currency_code: [u8; 3],
    pub decimals: u8,
    pub usd_rate: u64,
    pub last_rate_update: i64,
    pub oracle_price_feed: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProtocolConfig {
    pub max_ltv_buffer_bps: u16,
    pub liquidation_buffer_bps: u16,
    pub min_health_factor: u64,
    pub liquidation_reward_bps: u16,
    pub fee_rate_bps: u16,
    pub treasury_fee_share_bps: u16,
    pub insurance_fund_share_bps: u16,
    pub min_deposit_amount: u64,
    pub withdrawal_cooldown_secs: i64,
    pub deposit_cap_usd: u64,
    pub borrow_cap_usd: u64,
}
