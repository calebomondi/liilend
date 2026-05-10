pub mod marginfi_adapter;
pub mod save_adapter;

pub use marginfi_adapter::*;
pub use save_adapter::*;

use anchor_lang::prelude::*;
use crate::state::{ProtocolIntegration, VaultAccount};

pub fn dispatch_deposit<'a>(
    amount: u64,
    vault: &VaultAccount,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    remaining_accounts: &[AccountInfo<'a>],
) -> Result<()> {
    match vault.protocol_integration {
        ProtocolIntegration::MarginFi => {
            require!(
                remaining_accounts.len() >= 8,
                crate::errors::LiiLendError::CPICallFailed
            );
            deposit_to_marginfi(
                amount,
                &remaining_accounts[1],
                &remaining_accounts[2],
                &remaining_accounts[3],
                &remaining_accounts[0],
                vault_authority_bump,
                vault_asset_mint,
                &remaining_accounts[4],
                &remaining_accounts[5],
                &remaining_accounts[6],
                &remaining_accounts[7],
            )
        }
        ProtocolIntegration::SaveFinance => {
            require!(
                remaining_accounts.len() >= 10,
                crate::errors::LiiLendError::CPICallFailed
            );
            deposit_to_save(
                amount,
                &remaining_accounts[1],
                &remaining_accounts[0],
                vault_authority_bump,
                vault_asset_mint,
                &remaining_accounts[2],
                &remaining_accounts[3],
                &remaining_accounts[4],
                &remaining_accounts[5],
                &remaining_accounts[6],
                &remaining_accounts[7],
                &remaining_accounts[8],
                &remaining_accounts[9],
            )
        }
    }
}

pub fn dispatch_withdraw<'a>(
    amount: u64,
    withdraw_all: bool,
    vault: &VaultAccount,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    remaining_accounts: &[AccountInfo<'a>],
) -> Result<()> {
    match vault.protocol_integration {
        ProtocolIntegration::MarginFi => {
            require!(
                remaining_accounts.len() >= 9,
                crate::errors::LiiLendError::CPICallFailed
            );
            withdraw_from_marginfi(
                amount,
                withdraw_all,
                &remaining_accounts[1],
                &remaining_accounts[2],
                &remaining_accounts[3],
                &remaining_accounts[0],
                vault_authority_bump,
                vault_asset_mint,
                &remaining_accounts[4],
                &remaining_accounts[5],
                &remaining_accounts[6],
                &remaining_accounts[7],
                &remaining_accounts[8],
            )
        }
        ProtocolIntegration::SaveFinance => {
            require!(
                remaining_accounts.len() >= 10,
                crate::errors::LiiLendError::CPICallFailed
            );
            withdraw_from_save(
                amount,
                &remaining_accounts[1],
                &remaining_accounts[0],
                vault_authority_bump,
                vault_asset_mint,
                &remaining_accounts[2],
                &remaining_accounts[3],
                &remaining_accounts[4],
                &remaining_accounts[5],
                &remaining_accounts[6],
                &remaining_accounts[7],
                &remaining_accounts[8],
                &remaining_accounts[9],
            )
        }
    }
}

pub fn dispatch_borrow<'a>(
    amount: u64,
    vault: &VaultAccount,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    remaining_accounts: &[AccountInfo<'a>],
) -> Result<()> {
    match vault.protocol_integration {
        ProtocolIntegration::MarginFi => {
            require!(
                remaining_accounts.len() >= 9,
                crate::errors::LiiLendError::CPICallFailed
            );
            borrow_from_marginfi(
                amount,
                &remaining_accounts[1],
                &remaining_accounts[2],
                &remaining_accounts[3],
                &remaining_accounts[0],
                vault_authority_bump,
                vault_asset_mint,
                &remaining_accounts[4],
                &remaining_accounts[5],
                &remaining_accounts[6],
                &remaining_accounts[7],
                &remaining_accounts[8],
            )
        }
        ProtocolIntegration::SaveFinance => {
            require!(
                remaining_accounts.len() >= 10,
                crate::errors::LiiLendError::CPICallFailed
            );
            borrow_from_save(
                amount,
                &remaining_accounts[1],
                &remaining_accounts[0],
                vault_authority_bump,
                vault_asset_mint,
                &remaining_accounts[2],
                &remaining_accounts[3],
                &remaining_accounts[4],
                &remaining_accounts[5],
                &remaining_accounts[6],
                &remaining_accounts[7],
                &remaining_accounts[8],
                &remaining_accounts[9],
            )
        }
    }
}

pub fn dispatch_repay<'a>(
    amount: u64,
    repay_all: bool,
    vault: &VaultAccount,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    remaining_accounts: &[AccountInfo<'a>],
) -> Result<()> {
    match vault.protocol_integration {
        ProtocolIntegration::MarginFi => {
            require!(
                remaining_accounts.len() >= 8,
                crate::errors::LiiLendError::CPICallFailed
            );
            repay_to_marginfi(
                amount,
                repay_all,
                &remaining_accounts[1],
                &remaining_accounts[2],
                &remaining_accounts[3],
                &remaining_accounts[0],
                vault_authority_bump,
                vault_asset_mint,
                &remaining_accounts[4],
                &remaining_accounts[5],
                &remaining_accounts[6],
                &remaining_accounts[7],
            )
        }
        ProtocolIntegration::SaveFinance => {
            require!(
                remaining_accounts.len() >= 8,
                crate::errors::LiiLendError::CPICallFailed
            );
            repay_to_save(
                amount,
                &remaining_accounts[1],
                &remaining_accounts[0],
                vault_authority_bump,
                vault_asset_mint,
                &remaining_accounts[2],
                &remaining_accounts[3],
                &remaining_accounts[4],
                &remaining_accounts[5],
                &remaining_accounts[6],
                &remaining_accounts[7],
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::ProtocolIntegration;
    use crate::state::VaultAccount;

    fn test_vault(protocol: ProtocolIntegration) -> VaultAccount {
        VaultAccount {
            asset_mint: Pubkey::new_unique(),
            total_shares: 0,
            total_value: 0,
            protocol_integration: protocol,
            integrated_protocol_market: Pubkey::default(),
            lp_token_account: Pubkey::default(),
            yield_accrued: 0,
            last_yield_update_ts: 0,
            bump: 255,
        }
    }

    fn make_remaining_accounts(n: usize) -> Vec<AccountInfo<'static>> {
        let mut infos = Vec::with_capacity(n);
        for _ in 0..n {
            let key = Box::leak(Box::new(Pubkey::new_unique()));
            let lamports = Box::leak(Box::new(0u64));
            let data: &'static mut [u8] = Box::leak(Box::new([0u8; 0]));
            let owner = Box::leak(Box::new(Pubkey::default()));
            infos.push(AccountInfo::new(
                key,
                false,
                false,
                lamports,
                data,
                owner,
                false,
                0,
            ));
        }
        infos
    }

    #[test]
    fn test_dispatch_deposit_marginfi_requires_8() {
        let vault = test_vault(ProtocolIntegration::MarginFi);
        let remaining = make_remaining_accounts(7);
        // Set first remaining to marginfi program so routing check passes
        let result = dispatch_deposit(100, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatch_deposit_save_requires_10() {
        let vault = test_vault(ProtocolIntegration::SaveFinance);
        let remaining = make_remaining_accounts(9);
        let result = dispatch_deposit(100, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatch_withdraw_marginfi_requires_9() {
        let vault = test_vault(ProtocolIntegration::MarginFi);
        let remaining = make_remaining_accounts(8);
        let result = dispatch_withdraw(100, false, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatch_withdraw_save_requires_10() {
        let vault = test_vault(ProtocolIntegration::SaveFinance);
        let remaining = make_remaining_accounts(9);
        let result = dispatch_withdraw(100, false, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatch_borrow_marginfi_requires_9() {
        let vault = test_vault(ProtocolIntegration::MarginFi);
        let remaining = make_remaining_accounts(8);
        let result = dispatch_borrow(100, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatch_borrow_save_requires_10() {
        let vault = test_vault(ProtocolIntegration::SaveFinance);
        let remaining = make_remaining_accounts(9);
        let result = dispatch_borrow(100, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatch_repay_marginfi_requires_8() {
        let vault = test_vault(ProtocolIntegration::MarginFi);
        let remaining = make_remaining_accounts(7);
        let result = dispatch_repay(100, false, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatch_repay_save_requires_8() {
        let vault = test_vault(ProtocolIntegration::SaveFinance);
        let remaining = make_remaining_accounts(7);
        let result = dispatch_repay(100, false, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatch_deposit_empty_remaining_passes() {
        let vault = test_vault(ProtocolIntegration::MarginFi);
        let remaining = Vec::new();
        let result = dispatch_deposit(100, &vault, 255, &Pubkey::new_unique(), &remaining);
        assert!(result.is_err());
    }
}
