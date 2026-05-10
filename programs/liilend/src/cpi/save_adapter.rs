use anchor_lang::prelude::*;
use anchor_lang::solana_program;

pub const SAVE_PROGRAM_ID: &str = "So1endDq2YkqEjRh1dFGS7HVk25Ksfx4bNq3F7eG7Y";

const TAG_DEPOSIT_RESERVE_LIQUIDITY: u8 = 4;
const TAG_REDEEM_RESERVE_COLLATERAL: u8 = 5;
const TAG_BORROW_OBLIGATION_LIQUIDITY: u8 = 9;
const TAG_REPAY_OBLIGATION_LIQUIDITY: u8 = 10;

fn build_solend_data(tag: u8, args: &[u8]) -> Vec<u8> {
    let mut data = vec![tag];
    data.extend_from_slice(args);
    data
}

pub fn deposit_to_save<'a>(
    amount: u64,
    save_program: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    vault_ata: &AccountInfo<'a>,
    vault_ctoken_ata: &AccountInfo<'a>,
    reserve: &AccountInfo<'a>,
    reserve_liquidity_supply: &AccountInfo<'a>,
    reserve_collateral_mint: &AccountInfo<'a>,
    lending_market: &AccountInfo<'a>,
    lending_market_authority: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let data = build_solend_data(TAG_DEPOSIT_RESERVE_LIQUIDITY, &amount.to_le_bytes());

    let ix = solana_program::instruction::Instruction {
        program_id: save_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(vault_ata.key(), false),
            solana_program::instruction::AccountMeta::new(vault_ctoken_ata.key(), false),
            solana_program::instruction::AccountMeta::new(reserve.key(), false),
            solana_program::instruction::AccountMeta::new(reserve_liquidity_supply.key(), false),
            solana_program::instruction::AccountMeta::new(reserve_collateral_mint.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(lending_market.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(lending_market_authority.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(vault_authority.key(), true),
            solana_program::instruction::AccountMeta::new_readonly(token_program.key(), false),
        ],
        data,
    };

    let seeds = &[crate::state::VAULT_SEED, vault_asset_mint.as_ref(), &[vault_authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let infos = &[
        save_program.clone(),
        vault_ata.clone(),
        vault_ctoken_ata.clone(),
        reserve.clone(),
        reserve_liquidity_supply.clone(),
        reserve_collateral_mint.clone(),
        lending_market.clone(),
        lending_market_authority.clone(),
        vault_authority.clone(),
        token_program.clone(),
    ];

    solana_program::program::invoke_signed(&ix, infos, signer_seeds).map_err(|e| {
        msg!("Save deposit CPI failed: {:?}", e);
        crate::errors::LiiLendError::CPICallFailed
    })?;

    msg!("CPI: deposited {} to Save Finance", amount);
    Ok(())
}

pub fn withdraw_from_save<'a>(
    collateral_amount: u64,
    save_program: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    vault_ata: &AccountInfo<'a>,
    vault_ctoken_ata: &AccountInfo<'a>,
    reserve: &AccountInfo<'a>,
    reserve_collateral_mint: &AccountInfo<'a>,
    reserve_liquidity_supply: &AccountInfo<'a>,
    lending_market: &AccountInfo<'a>,
    lending_market_authority: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let data = build_solend_data(TAG_REDEEM_RESERVE_COLLATERAL, &collateral_amount.to_le_bytes());

    let ix = solana_program::instruction::Instruction {
        program_id: save_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(vault_ctoken_ata.key(), false),
            solana_program::instruction::AccountMeta::new(vault_ata.key(), false),
            solana_program::instruction::AccountMeta::new(reserve.key(), false),
            solana_program::instruction::AccountMeta::new(reserve_collateral_mint.key(), false),
            solana_program::instruction::AccountMeta::new(reserve_liquidity_supply.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(lending_market.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(lending_market_authority.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(vault_authority.key(), true),
            solana_program::instruction::AccountMeta::new_readonly(token_program.key(), false),
        ],
        data,
    };

    let seeds = &[crate::state::VAULT_SEED, vault_asset_mint.as_ref(), &[vault_authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let infos = &[
        save_program.clone(),
        vault_ctoken_ata.clone(),
        vault_ata.clone(),
        reserve.clone(),
        reserve_collateral_mint.clone(),
        reserve_liquidity_supply.clone(),
        lending_market.clone(),
        lending_market_authority.clone(),
        vault_authority.clone(),
        token_program.clone(),
    ];

    solana_program::program::invoke_signed(&ix, infos, signer_seeds).map_err(|e| {
        msg!("Save withdraw CPI failed: {:?}", e);
        crate::errors::LiiLendError::CPICallFailed
    })?;

    msg!("CPI: withdrew {} from Save Finance", collateral_amount);
    Ok(())
}

pub fn borrow_from_save<'a>(
    amount: u64,
    save_program: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    borrow_reserve: &AccountInfo<'a>,
    borrow_reserve_liquidity_supply: &AccountInfo<'a>,
    borrow_reserve_liquidity_fee_receiver: &AccountInfo<'a>,
    obligation: &AccountInfo<'a>,
    lending_market: &AccountInfo<'a>,
    lending_market_authority: &AccountInfo<'a>,
    destination_ata: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let data = build_solend_data(TAG_BORROW_OBLIGATION_LIQUIDITY, &amount.to_le_bytes());

    let ix = solana_program::instruction::Instruction {
        program_id: save_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(borrow_reserve_liquidity_supply.key(), false),
            solana_program::instruction::AccountMeta::new(destination_ata.key(), false),
            solana_program::instruction::AccountMeta::new(borrow_reserve.key(), false),
            solana_program::instruction::AccountMeta::new(borrow_reserve_liquidity_fee_receiver.key(), false),
            solana_program::instruction::AccountMeta::new(obligation.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(lending_market.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(lending_market_authority.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(vault_authority.key(), true),
            solana_program::instruction::AccountMeta::new_readonly(token_program.key(), false),
        ],
        data,
    };

    let seeds = &[crate::state::VAULT_SEED, vault_asset_mint.as_ref(), &[vault_authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let infos = &[
        save_program.clone(),
        borrow_reserve_liquidity_supply.clone(),
        destination_ata.clone(),
        borrow_reserve.clone(),
        borrow_reserve_liquidity_fee_receiver.clone(),
        obligation.clone(),
        lending_market.clone(),
        lending_market_authority.clone(),
        vault_authority.clone(),
        token_program.clone(),
    ];

    solana_program::program::invoke_signed(&ix, infos, signer_seeds).map_err(|e| {
        msg!("Save borrow CPI failed: {:?}", e);
        crate::errors::LiiLendError::CPICallFailed
    })?;

    msg!("CPI: borrowed {} from Save Finance", amount);
    Ok(())
}

pub fn repay_to_save<'a>(
    amount: u64,
    save_program: &AccountInfo<'a>,
    vault_authority: &AccountInfo<'a>,
    vault_authority_bump: u8,
    vault_asset_mint: &Pubkey,
    source_ata: &AccountInfo<'a>,
    repay_reserve: &AccountInfo<'a>,
    repay_reserve_liquidity_supply: &AccountInfo<'a>,
    obligation: &AccountInfo<'a>,
    lending_market: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> Result<()> {
    let data = build_solend_data(TAG_REPAY_OBLIGATION_LIQUIDITY, &amount.to_le_bytes());

    let ix = solana_program::instruction::Instruction {
        program_id: save_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(source_ata.key(), false),
            solana_program::instruction::AccountMeta::new(repay_reserve_liquidity_supply.key(), false),
            solana_program::instruction::AccountMeta::new(repay_reserve.key(), false),
            solana_program::instruction::AccountMeta::new(obligation.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(lending_market.key(), false),
            solana_program::instruction::AccountMeta::new_readonly(vault_authority.key(), true),
            solana_program::instruction::AccountMeta::new_readonly(token_program.key(), false),
        ],
        data,
    };

    let seeds = &[crate::state::VAULT_SEED, vault_asset_mint.as_ref(), &[vault_authority_bump]];
    let signer_seeds = &[&seeds[..]];

    let infos = &[
        save_program.clone(),
        source_ata.clone(),
        repay_reserve_liquidity_supply.clone(),
        repay_reserve.clone(),
        obligation.clone(),
        lending_market.clone(),
        vault_authority.clone(),
        token_program.clone(),
    ];

    solana_program::program::invoke_signed(&ix, infos, signer_seeds).map_err(|e| {
        msg!("Save repay CPI failed: {:?}", e);
        crate::errors::LiiLendError::CPICallFailed
    })?;

    msg!("CPI: repaid {} to Save Finance", amount);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solend_tags() {
        assert_eq!(TAG_DEPOSIT_RESERVE_LIQUIDITY, 4);
        assert_eq!(TAG_REDEEM_RESERVE_COLLATERAL, 5);
        assert_eq!(TAG_BORROW_OBLIGATION_LIQUIDITY, 9);
        assert_eq!(TAG_REPAY_OBLIGATION_LIQUIDITY, 10);
    }

    #[test]
    fn test_build_solend_data_deposit() {
        let amount = 1000u64;
        let data = build_solend_data(TAG_DEPOSIT_RESERVE_LIQUIDITY, &amount.to_le_bytes());
        assert_eq!(data.len(), 9);
        assert_eq!(data[0], 4);
        assert_eq!(data[1..], amount.to_le_bytes());
    }

    #[test]
    fn test_build_solend_data_borrow() {
        let amount = 500u64;
        let data = build_solend_data(TAG_BORROW_OBLIGATION_LIQUIDITY, &amount.to_le_bytes());
        assert_eq!(data.len(), 9);
        assert_eq!(data[0], 9);
        assert_eq!(data[1..], amount.to_le_bytes());
    }

    #[test]
    fn test_build_solend_data_withdraw() {
        let amount = 250u64;
        let data = build_solend_data(TAG_REDEEM_RESERVE_COLLATERAL, &amount.to_le_bytes());
        assert_eq!(data.len(), 9);
        assert_eq!(data[0], 5);
        assert_eq!(data[1..], amount.to_le_bytes());
    }

    #[test]
    fn test_build_solend_data_repay() {
        let amount = 750u64;
        let data = build_solend_data(TAG_REPAY_OBLIGATION_LIQUIDITY, &amount.to_le_bytes());
        assert_eq!(data.len(), 9);
        assert_eq!(data[0], 10);
        assert_eq!(data[1..], amount.to_le_bytes());
    }

    #[test]
    fn test_program_id_constants() {
        assert_eq!(
            SAVE_PROGRAM_ID,
            "So1endDq2YkqEjRh1dFGS7HVk25Ksfx4bNq3F7eG7Y"
        );
    }
}
