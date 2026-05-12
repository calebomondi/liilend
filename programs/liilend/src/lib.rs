use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
pub mod instructions;
pub mod utils;
pub mod cpi;

use instructions::*;
use state::{AssetType, OracleSource};

declare_id!("BrtmpQXVMryfdrtTQLxFaJtSTa78nULPuxJcQfFznpQc");

#[program]
pub mod liilend {
    use super::*;

    pub fn init_protocol(ctx: Context<InitProtocol>) -> Result<()> {
        instructions::init_protocol::handle_init_protocol(ctx)
    }

    pub fn configure_asset(
        ctx: Context<ConfigureAsset>,
        asset_index: u8,
        asset_type: AssetType,
        max_ltv_bps: u16,
        liquidation_threshold_bps: u16,
        liquidation_penalty_bps: u16,
        reserve_factor_bps: u16,
        deposit_cap: u64,
        borrow_cap: u64,
        oracle_source: OracleSource,
        pyth_price_feed: Pubkey,
        switchboard_price_feed: Pubkey,
    ) -> Result<()> {
        instructions::configure_asset::handle_configure_asset(
            ctx,
            asset_index,
            asset_type,
            max_ltv_bps,
            liquidation_threshold_bps,
            liquidation_penalty_bps,
            reserve_factor_bps,
            deposit_cap,
            borrow_cap,
            oracle_source,
            pyth_price_feed,
            switchboard_price_feed,
        )
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        instructions::deposit::handle_deposit(ctx, amount)
    }

    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, share_amount: u128) -> Result<()> {
        instructions::withdraw::handle_withdraw(ctx, share_amount)
    }

    pub fn borrow_asset(ctx: Context<BorrowAsset>, amount: u64) -> Result<()> {
        instructions::borrow::handle_borrow(ctx, amount)
    }

    pub fn repay_debt(ctx: Context<RepayDebt>, amount: u64) -> Result<()> {
        instructions::repay::handle_repay(ctx, amount)
    }

    pub fn liquidate_position(
        ctx: Context<LiquidatePosition>,
        max_debt_to_repay: u64,
    ) -> Result<()> {
        instructions::liquidate::handle_liquidate(ctx, max_debt_to_repay)
    }

    pub fn set_price_feed(
        ctx: Context<SetPriceFeed>,
        price: u64,
        decimals: u8,
        confidence: u64,
        ema_price: u64,
    ) -> Result<()> {
        instructions::set_price_feed::handle_set_price_feed(ctx, price, decimals, confidence, ema_price)
    }

    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        instructions::treasury_ops::handle_withdraw_treasury(ctx, amount)
    }

    pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
        instructions::treasury_ops::handle_collect_fees(ctx)
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        instructions::admin::handle_set_paused(ctx, paused)
    }

    pub fn transfer_authority(ctx: Context<TransferAuthority>) -> Result<()> {
        instructions::admin::handle_transfer_authority(ctx)
    }

    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        instructions::admin::handle_accept_authority(ctx)
    }

    pub fn update_asset_config(
        ctx: Context<UpdateAssetConfig>,
        max_ltv_bps: u16,
        liquidation_threshold_bps: u16,
        deposit_cap: u64,
        borrow_cap: u64,
        is_active: bool,
    ) -> Result<()> {
        instructions::admin::handle_update_asset_config(
            ctx,
            max_ltv_bps,
            liquidation_threshold_bps,
            deposit_cap,
            borrow_cap,
            is_active,
        )
    }
}
