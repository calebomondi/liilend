use anchor_lang::prelude::*;
use crate::errors::LiiLendError;

pub const MARGINFI_PROGRAM_ID: &str = "MFv2hWfSl8SXyFSJtTn4eBjbZ3kYkG6KxJKsWmT1Qj9";

pub fn deposit_to_marginfi(
    _amount: u64,
    _vault_authority: &AccountInfo,
    _marginfi_account: &AccountInfo,
    _marginfi_program: &AccountInfo,
) -> Result<()> {
    msg!("CPI: depositing to marginfi (integration stub)");
    Ok(())
}

pub fn withdraw_from_marginfi(
    _shares: u64,
    _vault_authority: &AccountInfo,
    _marginfi_account: &AccountInfo,
    _marginfi_program: &AccountInfo,
) -> Result<()> {
    msg!("CPI: withdrawing from marginfi (integration stub)");
    Ok(())
}

pub fn borrow_from_marginfi(
    _amount: u64,
    _vault_authority: &AccountInfo,
    _marginfi_account: &AccountInfo,
    _marginfi_program: &AccountInfo,
) -> Result<()> {
    msg!("CPI: borrowing from marginfi (integration stub)");
    Ok(())
}

pub fn repay_to_marginfi(
    _amount: u64,
    _vault_authority: &AccountInfo,
    _marginfi_account: &AccountInfo,
    _marginfi_program: &AccountInfo,
) -> Result<()> {
    msg!("CPI: repaying to marginfi (integration stub)");
    Ok(())
}
