use crate::errors::LiiLendError;
use std::result::Result as StdResult;

pub const SHARE_MULTIPLIER: u128 = 1_000_000_000;

pub fn shares_to_amount(shares: u128, total_shares: u128, total_value: u64) -> StdResult<u64, LiiLendError> {
    if total_shares == 0 {
        return Ok(0);
    }
    Ok(shares * total_value as u128 / total_shares).map(|v| v as u64)
}

pub fn amount_to_shares(amount: u64, total_shares: u128, total_value: u64) -> StdResult<u128, LiiLendError> {
    if total_value == 0 {
        return Ok(amount as u128 * SHARE_MULTIPLIER);
    }
    if total_shares == 0 {
        return Ok(amount as u128 * SHARE_MULTIPLIER);
    }
    Ok(amount as u128 * total_shares / total_value as u128)
}

pub fn debt_shares_to_amount(
    debt_shares: u128,
    total_debt_shares: u128,
    total_debt_value: u64,
) -> StdResult<u64, LiiLendError> {
    if total_debt_shares == 0 {
        return Ok(0);
    }
    Ok(debt_shares * total_debt_value as u128 / total_debt_shares).map(|v| v as u64)
}

pub fn amount_to_debt_shares(
    amount: u64,
    total_debt_shares: u128,
    total_debt_value: u64,
) -> StdResult<u128, LiiLendError> {
    if total_debt_value == 0 {
        return Ok(amount as u128 * SHARE_MULTIPLIER);
    }
    if total_debt_shares == 0 {
        return Ok(amount as u128 * SHARE_MULTIPLIER);
    }
    Ok(amount as u128 * total_debt_shares / total_debt_value as u128)
}
