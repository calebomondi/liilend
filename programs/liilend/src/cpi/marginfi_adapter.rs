use anchor_lang::prelude::*;
use anchor_lang::solana_program;

pub const MARGINFI_PROGRAM_ID: &str = "MFv2hWfSl8SXyFSJtTn4eBjbZ3kYkG6KxJKsWmT1Qj9";

const DEPOSIT_DISCRIMINATOR: [u8; 8] = [0xab, 0x5e, 0xeb, 0x67, 0x52, 0x40, 0xd4, 0x8c];
const WITHDRAW_DISCRIMINATOR: [u8; 8] = [0x24, 0x48, 0x4a, 0x13, 0xd2, 0xd2, 0xc0, 0xc0];
const BORROW_DISCRIMINATOR: [u8; 8] = [0x04, 0x7e, 0x74, 0x35, 0x30, 0x05, 0xd4, 0x1f];
const REPAY_DISCRIMINATOR: [u8; 8] = [0x4f, 0xd1, 0xac, 0xb1, 0xde, 0x33, 0xad, 0x97];

fn build_anchor_data(discriminator: &[u8; 8], args: &[u8]) -> Vec<u8> {
    let mut data = discriminator.to_vec();
    data.extend_from_slice(args);
    data
}

pub fn deposit_to_marginfi<'a>(
    amount: u64,
    marginfi_program: &AccountInfo<'a>,
    marginfi_group: &AccountInfo<'a>,
    marginfi_account: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    bank: &AccountInfo<'a>,
    vault_ata: &AccountInfo<'a>,
    bank_liquidity_vault: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let data = build_anchor_data(&DEPOSIT_DISCRIMINATOR, &amount.to_le_bytes());

    let ix = solana_program::instruction::Instruction {
        program_id: marginfi_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(marginfi_group.key(), false),
            solana_program::instruction::AccountMeta::new(marginfi_account.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(vault_authority.key(), true),
            solana_program::instruction::AccountMeta::new_readonly(bank.key(), false),
            solana_program::instruction::AccountMeta::new(vault_ata.key(), false),
            solana_program::instruction::AccountMeta::new(bank_liquidity_vault.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(token_program.key(), false),
        ],
        data,
    };

    let seeds = &[crate::state::VAULT_SEED, vault_asset_mint.as_ref(), &[vault_authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let infos = &[
        marginfi_program.clone(),
        marginfi_group.clone(),
        marginfi_account.clone(),
        vault_authority.clone(),
        bank.clone(),
        vault_ata.clone(),
        bank_liquidity_vault.clone(),
        token_program.clone(),
    ];

    solana_program::program::invoke_signed(&ix, infos, signer_seeds).map_err(|e| {
        msg!("Marginfi deposit CPI failed: {:?}", e);
        crate::errors::LiiLendError::CPICallFailed
    })?;

    msg!("CPI: deposited {} to marginfi", amount);
    Ok(())
}

pub fn withdraw_from_marginfi<'a>(
    amount: u64,
    withdraw_all: bool,
    marginfi_program: &AccountInfo<'a>,
    marginfi_group: &AccountInfo<'a>,
    marginfi_account: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    bank: &AccountInfo<'a>,
    vault_ata: &AccountInfo<'a>,
    bank_liquidity_vault_authority: &AccountInfo<'a>,
    bank_liquidity_vault: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let mut args = amount.to_le_bytes().to_vec();
    args.push(withdraw_all as u8);
    let data = build_anchor_data(&WITHDRAW_DISCRIMINATOR, &args);

    let ix = solana_program::instruction::Instruction {
        program_id: marginfi_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(marginfi_group.key(), false),
            solana_program::instruction::AccountMeta::new(marginfi_account.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(vault_authority.key(), true),
            solana_program::instruction::AccountMeta::new_readonly(bank.key(), false),
            solana_program::instruction::AccountMeta::new(vault_ata.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(bank_liquidity_vault_authority.key(), false),
            solana_program::instruction::AccountMeta::new(bank_liquidity_vault.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(token_program.key(), false),
        ],
        data,
    };

    let seeds = &[crate::state::VAULT_SEED, vault_asset_mint.as_ref(), &[vault_authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let infos = &[
        marginfi_program.clone(),
        marginfi_group.clone(),
        marginfi_account.clone(),
        vault_authority.clone(),
        bank.clone(),
        vault_ata.clone(),
        bank_liquidity_vault_authority.clone(),
        bank_liquidity_vault.clone(),
        token_program.clone(),
    ];

    solana_program::program::invoke_signed(&ix, infos, signer_seeds).map_err(|e| {
        msg!("Marginfi withdraw CPI failed: {:?}", e);
        crate::errors::LiiLendError::CPICallFailed
    })?;

    msg!("CPI: withdrew {} from marginfi", amount);
    Ok(())
}

pub fn borrow_from_marginfi<'a>(
    amount: u64,
    marginfi_program: &AccountInfo<'a>,
    marginfi_group: &AccountInfo<'a>,
    marginfi_account: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    bank: &AccountInfo<'a>,
    destination_ata: &AccountInfo<'a>,
    bank_liquidity_vault_authority: &AccountInfo<'a>,
    bank_liquidity_vault: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let data = build_anchor_data(&BORROW_DISCRIMINATOR, &amount.to_le_bytes());

    let ix = solana_program::instruction::Instruction {
        program_id: marginfi_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(marginfi_group.key(), false),
            solana_program::instruction::AccountMeta::new(marginfi_account.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(vault_authority.key(), true),
            solana_program::instruction::AccountMeta::new_readonly(bank.key(), false),
            solana_program::instruction::AccountMeta::new(destination_ata.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(bank_liquidity_vault_authority.key(), false),
            solana_program::instruction::AccountMeta::new(bank_liquidity_vault.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(token_program.key(), false),
        ],
        data,
    };

    let seeds = &[crate::state::VAULT_SEED, vault_asset_mint.as_ref(), &[vault_authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let infos = &[
        marginfi_program.clone(),
        marginfi_group.clone(),
        marginfi_account.clone(),
        vault_authority.clone(),
        bank.clone(),
        destination_ata.clone(),
        bank_liquidity_vault_authority.clone(),
        bank_liquidity_vault.clone(),
        token_program.clone(),
    ];

    solana_program::program::invoke_signed(&ix, infos, signer_seeds).map_err(|e| {
        msg!("Marginfi borrow CPI failed: {:?}", e);
        crate::errors::LiiLendError::CPICallFailed
    })?;

    msg!("CPI: borrowed {} from marginfi", amount);
    Ok(())
}

pub fn repay_to_marginfi<'a>(
    amount: u64,
    repay_all: bool,
    marginfi_program: &AccountInfo<'a>,
    marginfi_group: &AccountInfo<'a>,
    marginfi_account: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    bank: &AccountInfo<'a>,
    source_ata: &AccountInfo<'a>,
    bank_liquidity_vault: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let mut args = amount.to_le_bytes().to_vec();
    args.push(repay_all as u8);
    let data = build_anchor_data(&REPAY_DISCRIMINATOR, &args);

    let ix = solana_program::instruction::Instruction {
        program_id: marginfi_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(marginfi_group.key(), false),
            solana_program::instruction::AccountMeta::new(marginfi_account.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(vault_authority.key(), true),
            solana_program::instruction::AccountMeta::new_readonly(bank.key(), false),
            solana_program::instruction::AccountMeta::new(source_ata.key(), false),
            solana_program::instruction::AccountMeta::new(bank_liquidity_vault.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(token_program.key(), false),
        ],
        data,
    };

    let seeds = &[crate::state::VAULT_SEED, vault_asset_mint.as_ref(), &[vault_authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let infos = &[
        marginfi_program.clone(),
        marginfi_group.clone(),
        marginfi_account.clone(),
        vault_authority.clone(),
        bank.clone(),
        source_ata.clone(),
        bank_liquidity_vault.clone(),
        token_program.clone(),
    ];

    solana_program::program::invoke_signed(&ix, infos, signer_seeds).map_err(|e| {
        msg!("Marginfi repay CPI failed: {:?}", e);
        crate::errors::LiiLendError::CPICallFailed
    })?;

    msg!("CPI: repaid {} to marginfi", amount);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Verify discriminators match Anchor's sha256("global:<fn_name>")[..8]
    /// Preimages: lending_account_deposit, lending_account_withdraw,
    ///            lending_account_borrow, lending_account_repay
    #[test]
    fn test_deposit_discriminator() {
        // sha256("global:lending_account_deposit")[..8]
        assert_eq!(DEPOSIT_DISCRIMINATOR, [0xab, 0x5e, 0xeb, 0x67, 0x52, 0x40, 0xd4, 0x8c]);
    }

    #[test]
    fn test_withdraw_discriminator() {
        // sha256("global:lending_account_withdraw")[..8]
        assert_eq!(WITHDRAW_DISCRIMINATOR, [0x24, 0x48, 0x4a, 0x13, 0xd2, 0xd2, 0xc0, 0xc0]);
    }

    #[test]
    fn test_borrow_discriminator() {
        // sha256("global:lending_account_borrow")[..8]
        assert_eq!(BORROW_DISCRIMINATOR, [0x04, 0x7e, 0x74, 0x35, 0x30, 0x05, 0xd4, 0x1f]);
    }

    #[test]
    fn test_repay_discriminator() {
        // sha256("global:lending_account_repay")[..8]
        assert_eq!(REPAY_DISCRIMINATOR, [0x4f, 0xd1, 0xac, 0xb1, 0xde, 0x33, 0xad, 0x97]);
    }

    #[test]
    fn test_build_anchor_data() {
        let disc = [0xab, 0x5e, 0xeb, 0x67, 0x52, 0x40, 0xd4, 0x8c];
        let args = 42u64.to_le_bytes();
        let data = build_anchor_data(&disc, &args);
        assert_eq!(data.len(), 16);
        assert_eq!(data[..8], disc);
        assert_eq!(data[8..], args);
    }

    #[test]
    fn test_build_anchor_data_with_withdraw_all() {
        let disc = WITHDRAW_DISCRIMINATOR;
        let mut args = 100u64.to_le_bytes().to_vec();
        args.push(1u8);
        let data = build_anchor_data(&disc, &args);
        assert_eq!(data.len(), 17);
        assert_eq!(data[..8], disc);
        assert_eq!(data[8..16], 100u64.to_le_bytes());
        assert_eq!(data[16], 1u8);
    }

}
