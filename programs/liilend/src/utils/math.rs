use crate::errors::LiiLendError;
use std::result::Result as StdResult;

pub const BASIS_POINTS_DIVISOR: u64 = 10_000;

pub fn calculate_ltv(borrow_value: u64, collateral_value: u64) -> StdResult<u64, LiiLendError> {
    if collateral_value == 0 {
        return Err(LiiLendError::MathOverflow);
    }
    Ok(borrow_value as u128 * BASIS_POINTS_DIVISOR as u128 / collateral_value as u128)
        .map(|v| v as u64)
}

pub fn calculate_health_factor(
    collateral_value: u64,
    borrow_value: u64,
    liquidation_threshold_bps: u16,
) -> StdResult<u64, LiiLendError> {
    if borrow_value == 0 {
        return Ok(u64::MAX);
    }
    let weighted_collateral = (collateral_value as u128) * (liquidation_threshold_bps as u128);
    Ok(weighted_collateral / (borrow_value as u128 * BASIS_POINTS_DIVISOR as u128))
        .map(|v| v as u64)
}

pub fn apply_slippage(amount: u64, slippage_bps: u16) -> StdResult<u64, LiiLendError> {
    Ok(amount as u128 * (BASIS_POINTS_DIVISOR - slippage_bps as u64) as u128
        / BASIS_POINTS_DIVISOR as u128)
        .map(|v| v as u64)
}

pub fn calculate_liquidation_amount(
    debt_value: u64,
    liquidation_penalty_bps: u16,
) -> StdResult<u64, LiiLendError> {
    Ok(debt_value as u128 * (BASIS_POINTS_DIVISOR + liquidation_penalty_bps as u64) as u128
        / BASIS_POINTS_DIVISOR as u128)
        .map(|v| v as u64)
}

pub fn apply_fee(amount: u64, fee_rate_bps: u16) -> StdResult<(u64, u64), LiiLendError> {
    let fee = amount as u128 * fee_rate_bps as u128 / BASIS_POINTS_DIVISOR as u128;
    let net = (amount as u128).checked_sub(fee).ok_or(LiiLendError::MathOverflow)?;
    Ok((net as u64, fee as u64))
}

pub fn calculate_utilization_rate(total_borrows: u64, total_deposits: u64) -> StdResult<u64, LiiLendError> {
    if total_deposits == 0 {
        return Ok(0);
    }
    Ok(total_borrows as u128 * BASIS_POINTS_DIVISOR as u128 / total_deposits as u128)
        .map(|v| v as u64)
}

pub fn adjust_ltv_with_buffer(max_ltv_bps: u16, buffer_bps: u16) -> u16 {
    max_ltv_bps.saturating_sub(buffer_bps)
}

pub fn adjust_liquidation_threshold_with_buffer(
    liquidation_threshold_bps: u16,
    buffer_bps: u16,
) -> u16 {
    liquidation_threshold_bps.saturating_sub(buffer_bps)
}
