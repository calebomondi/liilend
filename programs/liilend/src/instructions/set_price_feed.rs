use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::LiiLendError;

#[derive(Accounts)]
pub struct SetPriceFeed<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_state.bump,
        has_one = authority @ LiiLendError::UnauthorizedAccess
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [PRICE_FEED_SEED, asset_mint.key().as_ref()],
        bump = price_feed.bump,
    )]
    pub price_feed: Account<'info, PriceFeed>,

    /// CHECK: Oracle price account (Pyth)
    pub pyth_price_account: AccountInfo<'info>,

    /// CHECK: Oracle price account (Switchboard)
    pub switchboard_price_account: AccountInfo<'info>,

    /// CHECK: Asset mint account - validated through price_feed seed derivation
    pub asset_mint: AccountInfo<'info>,

    pub authority: Signer<'info>,
}

pub fn handle_set_price_feed(
    ctx: Context<SetPriceFeed>,
    price: u64,
    decimals: u8,
    confidence: u64,
    ema_price: u64,
) -> Result<()> {
    let price_feed = &mut ctx.accounts.price_feed;
    price_feed.price = price;
    price_feed.decimals = decimals;
    price_feed.confidence = confidence;
    price_feed.ema_price = ema_price;
    price_feed.last_update_ts = Clock::get()?.unix_timestamp;
    price_feed.is_valid = true;

    emit!(PriceFeedUpdated {
        asset: ctx.accounts.asset_mint.key(),
        price,
        decimals,
        confidence,
    });

    Ok(())
}

#[event]
pub struct PriceFeedUpdated {
    pub asset: Pubkey,
    pub price: u64,
    pub decimals: u8,
    pub confidence: u64,
}
