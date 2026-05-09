use anchor_lang::prelude::*;
use crate::errors::LiiLendError;

pub const SAVE_PROGRAM_ID: &str = "So1endDq2YkqEjRh1dFGS7HVk25Ksfx4bNq3F7eG7Y";

pub fn deposit_to_save(
    _amount: u64,
    _vault_authority: &AccountInfo,
    _save_market: &AccountInfo,
    _save_program: &AccountInfo,
) -> Result<()> {
    msg!("CPI: depositing to Save Finance (integration stub)");
    Ok(())
}

pub fn withdraw_from_save(
    _shares: u64,
    _vault_authority: &AccountInfo,
    _save_market: &AccountInfo,
    _save_program: &AccountInfo,
) -> Result<()> {
    msg!("CPI: withdrawing from Save Finance (integration stub)");
    Ok(())
}

pub fn borrow_from_save(
    _amount: u64,
    _vault_authority: &AccountInfo,
    _save_market: &AccountInfo,
    _save_program: &AccountInfo,
) -> Result<()> {
    msg!("CPI: borrowing from Save Finance (integration stub)");
    Ok(())
}

pub fn repay_to_save(
    _amount: u64,
    _vault_authority: &AccountInfo,
    _save_market: &AccountInfo,
    _save_program: &AccountInfo,
) -> Result<()> {
    msg!("CPI: repaying to Save Finance (integration stub)");
    Ok(())
}
