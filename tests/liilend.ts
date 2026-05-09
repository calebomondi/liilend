// import * as anchor from "@coral-xyz/anchor";
// import { Program, BN, web3 } from "@coral-xyz/anchor";
// import { Liilend } from "../target/types/liilend";
// import { assert } from "chai";
// import {
//   createMint,
//   getOrCreateAssociatedTokenAccount,
//   mintTo,
//   TOKEN_PROGRAM_ID,
//   getAccount,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   createAssociatedTokenAccountInstruction,
// } from "@solana/spl-token";

// const PROTOCOL_SEED = Buffer.from("liilend-protocol");
// const TREASURY_SEED = Buffer.from("liilend-treasury");
// const VAULT_SEED = Buffer.from("liilend-vault");
// const USER_SEED = Buffer.from("liilend-user");
// const PRICE_FEED_SEED = Buffer.from("liilend-price-feed");

// describe("LiiLend Protocol Tests", () => {
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);
//   const program = anchor.workspace.Liilend as Program<Liilend>;

//   const authority = provider.wallet.publicKey;
//   const user = anchor.web3.Keypair.generate();
//   const liquidator = anchor.web3.Keypair.generate();
//   const newAuthority = anchor.web3.Keypair.generate();

//   let protocolStatePda: web3.PublicKey;
//   let protocolStateBump: number;
//   let treasuryPda: web3.PublicKey;

//   let solMint: web3.PublicKey;
//   let usdcMint: web3.PublicKey;

//   let solVaultPda: web3.PublicKey;
//   let usdcVaultPda: web3.PublicKey;
//   let solPriceFeedPda: web3.PublicKey;
//   let usdcPriceFeedPda: web3.PublicKey;

//   let solVaultAta: web3.PublicKey;
//   let usdcVaultAta: web3.PublicKey;
//   let treasuryAta: web3.PublicKey;

//   let userSolAta: web3.PublicKey;
//   let userUsdcAta: web3.PublicKey;
//   let liquidatorSolAta: web3.PublicKey;
//   let liquidatorUsdcAta: web3.PublicKey;

//   let userAccountPda: web3.PublicKey;
//   let userSolCollateralPda: web3.PublicKey;
//   let userUsdcBorrowPda: web3.PublicKey;
//   let liquidatorUsdcBorrowPda: web3.PublicKey;

//   before(async () => {
//     await provider.connection.confirmTransaction(
//       await provider.connection.requestAirdrop(user.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
//       "confirmed"
//     );
//     await provider.connection.confirmTransaction(
//       await provider.connection.requestAirdrop(liquidator.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
//       "confirmed"
//     );

//     [protocolStatePda, protocolStateBump] = web3.PublicKey.findProgramAddressSync(
//       [PROTOCOL_SEED],
//       program.programId
//     );
//     [treasuryPda] = web3.PublicKey.findProgramAddressSync(
//       [TREASURY_SEED],
//       program.programId
//     );

//     solMint = await createMint(
//       provider.connection,
//       user,
//       user.publicKey,
//       null,
//       9
//     );

//     usdcMint = await createMint(
//       provider.connection,
//       user,
//       user.publicKey,
//       null,
//       6
//     );

//     [solVaultPda] = web3.PublicKey.findProgramAddressSync(
//       [VAULT_SEED, solMint.toBuffer()],
//       program.programId
//     );
//     [usdcVaultPda] = web3.PublicKey.findProgramAddressSync(
//       [VAULT_SEED, usdcMint.toBuffer()],
//       program.programId
//     );
//     [solPriceFeedPda] = web3.PublicKey.findProgramAddressSync(
//       [PRICE_FEED_SEED, solMint.toBuffer()],
//       program.programId
//     );
//     [usdcPriceFeedPda] = web3.PublicKey.findProgramAddressSync(
//       [PRICE_FEED_SEED, usdcMint.toBuffer()],
//       program.programId
//     );

//     [userAccountPda] = web3.PublicKey.findProgramAddressSync(
//       [USER_SEED, user.publicKey.toBuffer()],
//       program.programId
//     );
//     [userSolCollateralPda] = web3.PublicKey.findProgramAddressSync(
//       [USER_SEED, user.publicKey.toBuffer(), solMint.toBuffer()],
//       program.programId
//     );
//     [userUsdcBorrowPda] = web3.PublicKey.findProgramAddressSync(
//       [USER_SEED, user.publicKey.toBuffer(), usdcMint.toBuffer()],
//       program.programId
//     );
//     [liquidatorUsdcBorrowPda] = web3.PublicKey.findProgramAddressSync(
//       [USER_SEED, liquidator.publicKey.toBuffer(), usdcMint.toBuffer()],
//       program.programId
//     );

//     userSolAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         user,
//         solMint,
//         user.publicKey
//       )
//     ).address;

//     userUsdcAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         user,
//         usdcMint,
//         user.publicKey
//       )
//     ).address;

//     liquidatorSolAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         liquidator,
//         solMint,
//         liquidator.publicKey
//       )
//     ).address;

//     liquidatorUsdcAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         liquidator,
//         usdcMint,
//         liquidator.publicKey
//       )
//     ).address;

//     // Create vault ATAs
//     solVaultAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         authority,
//         solMint,
//         solVaultPda,
//         true
//       )
//     ).address;

//     usdcVaultAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         authority,
//         usdcMint,
//         usdcVaultPda,
//         true
//       )
//     ).address;

//     treasuryAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         authority,
//         usdcMint,
//         treasuryPda,
//         true
//       )
//     ).address;

//     // Mint initial tokens to user
//     await mintTo(
//       provider.connection,
//       user,
//       solMint,
//       userSolAta,
//       user.publicKey,
//       10_000 * 10 ** 9
//     );
//     await mintTo(
//       provider.connection,
//       user,
//       usdcMint,
//       userUsdcAta,
//       user.publicKey,
//       100_000 * 10 ** 6
//     );
//     // Mint to liquidator for testing
//     await mintTo(
//       provider.connection,
//       user,
//       usdcMint,
//       liquidatorUsdcAta,
//       user.publicKey,
//       50_000 * 10 ** 6
//     );
//   });

//   it("1. Protocol initialization", async () => {
//     await program.methods
//       .initProtocol()
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         treasury: treasuryPda,
//         payer: authority,
//         systemProgram: web3.SystemProgram.programId,
//         authority: authority,
//       })
//       .rpc();

//     const state = await program.account.protocolState.fetch(protocolStatePda);
//     assert.strictEqual(state.authority.toBase58(), authority.toBase58());
//     assert.strictEqual(state.treasury.toBase58(), treasuryPda.toBase58());
//     assert.strictEqual(state.feeAuthority.toBase58(), authority.toBase58());
//     assert.strictEqual(state.paused, false);
//     assert.strictEqual(state.assetCount, 0);

//     const treasury = await program.account.treasuryAccount.fetch(treasuryPda);
//     assert.strictEqual(treasury.feeAccumulator.toNumber(), 0);
//     assert.strictEqual(treasury.insuranceFund.toNumber(), 0);
//   });

//   it("2. Configure SOL as collateral asset", async () => {
//     await program.methods
//       .configureAsset(
//         0,
//         { both: {} },
//         5_000,
//         5_500,
//         500,
//         1_000,
//         new BN(100_000 * 10 ** 9),
//         new BN(0),
//         { pyth: {} },
//         anchor.web3.PublicKey.default,
//         anchor.web3.PublicKey.default
//       )
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: solVaultPda,
//         priceFeed: solPriceFeedPda,
//         mint: solMint,
//         payer: authority,
//         authority: authority,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .rpc();

//     const state = await program.account.protocolState.fetch(protocolStatePda);
//     assert.strictEqual(state.assetCount, 1);

//     const vault = await program.account.vaultAccount.fetch(solVaultPda);
//     assert.strictEqual(vault.assetMint.toBase58(), solMint.toBase58());
//     assert.strictEqual(vault.totalShares.toNumber(), 0);
//     assert.strictEqual(vault.totalValue.toNumber(), 0);

//     const priceFeed = await program.account.priceFeed.fetch(solPriceFeedPda);
//     assert.strictEqual(priceFeed.assetMint.toBase58(), solMint.toBase58());
//     assert.strictEqual(priceFeed.isValid, false);
//   });

//   it("3. Configure USDC as borrowable asset", async () => {
//     await program.methods
//       .configureAsset(
//         1,
//         { both: {} },
//         8_000,
//         8_500,
//         500,
//         1_000,
//         new BN(1_000_000 * 10 ** 6),
//         new BN(500_000 * 10 ** 6),
//         { pyth: {} },
//         anchor.web3.PublicKey.default,
//         anchor.web3.PublicKey.default
//       )
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: usdcVaultPda,
//         priceFeed: usdcPriceFeedPda,
//         mint: usdcMint,
//         payer: authority,
//         authority: authority,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .rpc();

//     const state = await program.account.protocolState.fetch(protocolStatePda);
//     assert.strictEqual(state.assetCount, 2);

//     const vault = await program.account.vaultAccount.fetch(usdcVaultPda);
//     assert.strictEqual(vault.assetMint.toBase58(), usdcMint.toBase58());
//   });

//   it("4. Deposit SOL collateral", async () => {
//     // Set price feed for SOL first
//     await program.methods
//       .setPriceFeed(
//         new BN(100_000_000_000),
//         8,
//         new BN(1_000_000),
//         new BN(100_500_000_000)
//       )
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         priceFeed: solPriceFeedPda,
//         pythPriceAccount: anchor.web3.PublicKey.default,
//         switchboardPriceAccount: anchor.web3.PublicKey.default,
//         assetMint: solMint,
//         authority: authority,
//       })
//       .rpc();

//     const userSolBefore = (await getAccount(provider.connection, userSolAta)).amount;
//     const vaultSolBefore = (await getAccount(provider.connection, solVaultAta)).amount;

//     const depositAmount = new BN(100 * 10 ** 9);
//     await program.methods
//       .depositCollateral(depositAmount)
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: solVaultPda,
//         userCollateral: userSolCollateralPda,
//         userAccount: userAccountPda,
//         vaultAta: solVaultAta,
//         userAta: userSolAta,
//         assetMint: solMint,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();

//     const userSolAfter = (await getAccount(provider.connection, userSolAta)).amount;
//     const vaultSolAfter = (await getAccount(provider.connection, solVaultAta)).amount;

//     assert.strictEqual(
//       userSolBefore - userSolAfter,
//       BigInt(depositAmount.toString())
//     );
//     assert.strictEqual(
//       vaultSolAfter - vaultSolBefore,
//       BigInt(depositAmount.toString())
//     );

//     const vault = await program.account.vaultAccount.fetch(solVaultPda);
//     assert.strictEqual(vault.totalValue.toNumber(), depositAmount.toNumber());

//     const userAccount = await program.account.userAccount.fetch(userAccountPda);
//     assert(userAccount.collateralShares.gt(new BN(0)));

//     const userCollateral = await program.account.userCollateralAccount.fetch(userSolCollateralPda);
//     assert(userCollateral.shares.gt(new BN(0)));
//   });

//   it("5. Withdraw SOL collateral", async () => {
//     const vaultBefore = await program.account.vaultAccount.fetch(solVaultPda);
//     const totalShares = vaultBefore.totalShares;
//     const totalValue = vaultBefore.totalValue;

//     const withdrawShareAmount = totalShares.div(new BN(2));
//     const expectedWithdrawAmount = withdrawShareAmount.mul(totalValue).div(totalShares);

//     const userSolBefore = (await getAccount(provider.connection, userSolAta)).amount;
//     const vaultSolBefore = (await getAccount(provider.connection, solVaultAta)).amount;

//     await program.methods
//       .withdrawCollateral(withdrawShareAmount)
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: solVaultPda,
//         userCollateral: userSolCollateralPda,
//         userAccount: userAccountPda,
//         vaultAta: solVaultAta,
//         userAta: userSolAta,
//         assetMint: solMint,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();

//     const userSolAfter = (await getAccount(provider.connection, userSolAta)).amount;
//     const vaultSolAfter = (await getAccount(provider.connection, solVaultAta)).amount;

//     assert.strictEqual(
//       userSolAfter - userSolBefore,
//       BigInt(expectedWithdrawAmount.toString())
//     );
//     assert.strictEqual(
//       vaultSolBefore - vaultSolAfter,
//       BigInt(expectedWithdrawAmount.toString())
//     );

//     const userCollateral = await program.account.userCollateralAccount.fetch(userSolCollateralPda);
//     assert(userCollateral.shares.gt(new BN(0)));
//   });

//   it("6. Deposit SOL again for borrow test", async () => {
//     // Redeposit to have full collateral
//     const redepositAmount = new BN(50 * 10 ** 9);

//     await program.methods
//       .depositCollateral(redepositAmount)
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: solVaultPda,
//         userCollateral: userSolCollateralPda,
//         userAccount: userAccountPda,
//         vaultAta: solVaultAta,
//         userAta: userSolAta,
//         assetMint: solMint,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();

//     // Get vault ATA for USDC
//     usdcVaultAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         authority,
//         usdcMint,
//         usdcVaultPda,
//         true
//       )
//     ).address;

//     // Mint USDC to vault for borrow liquidity
//     await mintTo(
//       provider.connection,
//       user,
//       usdcMint,
//       usdcVaultAta,
//       user.publicKey,
//       10_000 * 10 ** 6
//     );

//     const vault = await program.account.vaultAccount.fetch(usdcVaultPda);
//     assert.strictEqual(vault.totalValue.toNumber(), 0);

//     // Actually deposit USDC into vault first so there's liquidity
//     await program.methods
//       .depositCollateral(new BN(1_000 * 10 ** 6))
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: usdcVaultPda,
//         userCollateral: userUsdcBorrowPda,
//         userAccount: userAccountPda,
//         vaultAta: usdcVaultAta,
//         userAta: userUsdcAta,
//         assetMint: usdcMint,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();
//   });

//   it("7. Borrow USDC against SOL", async () => {
//     const userUsdcBefore = (await getAccount(provider.connection, userUsdcAta)).amount;
//     const vaultUsdcBefore = (await getAccount(provider.connection, usdcVaultAta)).amount;

//     await program.methods
//       .borrowAsset(new BN(100 * 10 ** 6))
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: usdcVaultPda,
//         userAccount: userAccountPda,
//         borrowPosition: userUsdcBorrowPositionPda,
//         vaultAta: usdcVaultAta,
//         userAta: userUsdcAta,
//         borrowMint: usdcMint,
//         collateralPriceFeed: solPriceFeedPda,
//         borrowPriceFeed: usdcPriceFeedPda,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();

//     const userUsdcAfter = (await getAccount(provider.connection, userUsdcAta)).amount;
//     const vaultUsdcAfter = (await getAccount(provider.connection, usdcVaultAta)).amount;

//     assert.strictEqual(
//       userUsdcAfter - userUsdcBefore,
//       BigInt(100 * 10 ** 6)
//     );
//     assert.strictEqual(
//       vaultUsdcBefore - vaultUsdcAfter,
//       BigInt(100 * 10 ** 6)
//     );

//     const borrowPos = await program.account.borrowPosition.fetch(userUsdcBorrowPda);
//     assert(borrowPos.debtShares.gt(new BN(0)));
//     assert.strictEqual(borrowPos.owner.toBase58(), user.publicKey.toBase58());
//     assert.strictEqual(borrowPos.borrowMint.toBase58(), usdcMint.toBase58());
//   });

//   it("8. Repay USDC debt", async () => {
//     const userUsdcBefore = (await getAccount(provider.connection, userUsdcAta)).amount;
//     const vaultUsdcBefore = (await getAccount(provider.connection, usdcVaultAta)).amount;

//     await program.methods
//       .repayDebt(new BN(100 * 10 ** 6))
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: usdcVaultPda,
//         borrowPosition: userUsdcBorrowPositionPda,
//         userAccount: userAccountPda,
//         vaultAta: usdcVaultAta,
//         userAta: userUsdcAta,
//         repayMint: usdcMint,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();

//     const userUsdcAfter = (await getAccount(provider.connection, userUsdcAta)).amount;
//     const vaultUsdcAfter = (await getAccount(provider.connection, usdcVaultAta)).amount;

//     assert.strictEqual(
//       userUsdcBefore - userUsdcAfter,
//       BigInt(100 * 10 ** 6)
//     );
//     assert.strictEqual(
//       vaultUsdcAfter - vaultUsdcBefore,
//       BigInt(100 * 10 ** 6)
//     );

//     const borrowPos = await program.account.borrowPosition.fetch(userUsdcBorrowPda);
//     assert(borrowPos.debtShares.eq(new BN(0)));
//   });

//   it("9. Full deposit -> borrow -> repay cycle", async () => {
//     // Re-borrow and fully repay
//     await program.methods
//       .borrowAsset(new BN(50 * 10 ** 6))
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: usdcVaultPda,
//         userAccount: userAccountPda,
//         borrowPosition: userUsdcBorrowPositionPda,
//         vaultAta: usdcVaultAta,
//         userAta: userUsdcAta,
//         borrowMint: usdcMint,
//         collateralPriceFeed: solPriceFeedPda,
//         borrowPriceFeed: usdcPriceFeedPda,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();

//     const borrowPosAfterBorrow = await program.account.borrowPosition.fetch(userUsdcBorrowPda);
//     assert(borrowPosAfterBorrow.debtShares.gt(new BN(0)));

//     await program.methods
//       .repayDebt(new BN(50 * 10 ** 6))
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: usdcVaultPda,
//         borrowPosition: userUsdcBorrowPositionPda,
//         userAccount: userAccountPda,
//         vaultAta: usdcVaultAta,
//         userAta: userUsdcAta,
//         repayMint: usdcMint,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();

//     const borrowPosFinal = await program.account.borrowPosition.fetch(userUsdcBorrowPda);
//     assert(borrowPosFinal.debtShares.eq(new BN(0)));
//   });

//   it("10. Liquidation of underwater position", async () => {
//     // User borrows USDC again
//     await program.methods
//       .borrowAsset(new BN(200 * 10 ** 6))
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         vault: usdcVaultPda,
//         userAccount: userAccountPda,
//         borrowPosition: userUsdcBorrowPositionPda,
//         vaultAta: usdcVaultAta,
//         userAta: userUsdcAta,
//         borrowMint: usdcMint,
//         collateralPriceFeed: solPriceFeedPda,
//         borrowPriceFeed: usdcPriceFeedPda,
//         authority: user.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();

//     const liquidatorUsdcBefore = (await getAccount(provider.connection, liquidatorUsdcAta)).amount;

//     const borrowPos = await program.account.borrowPosition.fetch(userUsdcBorrowPda);
//     assert(borrowPos.debtShares.gt(new BN(0)));

//     await program.methods
//       .liquidatePosition(new BN(200 * 10 ** 6))
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         treasury: treasuryPda,
//         collateralVault: solVaultPda,
//         borrowVault: usdcVaultPda,
//         liquidateeAccount: userAccountPda,
//         liquidateeCollateral: userSolCollateralPda,
//         liquidateeBorrow: userUsdcBorrowPda,
//         collateralVaultAta: solVaultAta,
//         borrowVaultAta: usdcVaultAta,
//         liquidatorAta: liquidatorUsdcAta,
//         collateralMint: solMint,
//         borrowMint: usdcMint,
//         liquidatee: user.publicKey,
//         liquidator: liquidator.publicKey,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: web3.SystemProgram.programId,
//       })
//       .signers([liquidator])
//       .rpc();

//     const liquidatorUsdcAfter = (await getAccount(provider.connection, liquidatorUsdcAta)).amount;
//     assert(liquidatorUsdcAfter > liquidatorUsdcBefore);
//   });

//   it("11. Pause protocol", async () => {
//     await program.methods
//       .setPaused(true)
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         authority: authority,
//       })
//       .rpc();

//     const state = await program.account.protocolState.fetch(protocolStatePda);
//     assert.strictEqual(state.paused, true);
//   });

//   it("12. Unpause protocol", async () => {
//     await program.methods
//       .setPaused(false)
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         authority: authority,
//       })
//       .rpc();

//     const state = await program.account.protocolState.fetch(protocolStatePda);
//     assert.strictEqual(state.paused, false);
//   });

//   it("13. Transfer authority", async () => {
//     await program.methods
//       .transferAuthority()
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         authority: authority,
//         newAuthority: newAuthority.publicKey,
//       })
//       .signers([newAuthority])
//       .rpc();

//     const state = await program.account.protocolState.fetch(protocolStatePda);
//     assert.strictEqual(state.proposedAuthority.toBase58(), newAuthority.publicKey.toBase58());
//     assert.strictEqual(state.authority.toBase58(), authority.toBase58());
//   });

//   it("14. Accept authority", async () => {
//     await program.methods
//       .acceptAuthority()
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         authority: newAuthority.publicKey,
//       })
//       .signers([newAuthority])
//       .rpc();

//     const state = await program.account.protocolState.fetch(protocolStatePda);
//     assert.strictEqual(state.authority.toBase58(), newAuthority.publicKey.toBase58());
//     assert.strictEqual(state.proposedAuthority.toBase58(), anchor.web3.PublicKey.default.toBase58());
//   });

//   it("15. Transfer authority back", async () => {
//     await program.methods
//       .transferAuthority()
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         authority: newAuthority.publicKey,
//         newAuthority: authority,
//       })
//       .signers([newAuthority])
//       .rpc();

//     await program.methods
//       .acceptAuthority()
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         authority: authority,
//       })
//       .rpc();

//     const state = await program.account.protocolState.fetch(protocolStatePda);
//     assert.strictEqual(state.authority.toBase58(), authority.toBase58());
//   });

//   it("16. Update price feed", async () => {
//     await program.methods
//       .setPriceFeed(
//         new BN(150_000_000_000),
//         8,
//         new BN(500_000),
//         new BN(151_000_000_000)
//       )
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         priceFeed: solPriceFeedPda,
//         pythPriceAccount: anchor.web3.PublicKey.default,
//         switchboardPriceAccount: anchor.web3.PublicKey.default,
//         assetMint: solMint,
//         authority: authority,
//       })
//       .rpc();

//     const priceFeed = await program.account.priceFeed.fetch(solPriceFeedPda);
//     assert.strictEqual(priceFeed.price.toNumber(), 150_000_000_000);
//     assert.strictEqual(priceFeed.decimals, 8);
//     assert.strictEqual(priceFeed.isValid, true);
//   });

//   it("17. Update asset config", async () => {
//     await program.methods
//       .updateAssetConfig(
//         6_000,
//         6_500,
//         new BN(200_000 * 10 ** 9),
//         new BN(100_000 * 10 ** 9),
//         true
//       )
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         priceFeed: solPriceFeedPda,
//         mint: solMint,
//         authority: authority,
//       })
//       .rpc();

//     const priceFeed = await program.account.priceFeed.fetch(solPriceFeedPda);
//     assert.strictEqual(priceFeed.isValid, true);
//   });

//   it("18. Treasury operations - collect fees", async () => {
//     const treasuryBefore = await program.account.treasuryAccount.fetch(treasuryPda);

//     await program.methods
//       .collectFees()
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         treasury: treasuryPda,
//         authority: authority,
//       })
//       .rpc();

//     const treasuryAfter = await program.account.treasuryAccount.fetch(treasuryPda);
//     assert.strictEqual(treasuryAfter.spreadRevenue.toNumber(), treasuryBefore.spreadRevenue.toNumber());
//     assert.strictEqual(treasuryAfter.feeAccumulator.toNumber(), 0);
//   });

//   it("19. Treasury operations - withdraw funds", async () => {
//     treasuryAta = (
//       await getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         authority,
//         solMint,
//         treasuryPda,
//         true
//       )
//     ).address;

//     const treasuryAtaBefore = (await getAccount(provider.connection, treasuryAta)).amount;
//     const recipientSolBefore = (await getAccount(provider.connection, userSolAta)).amount;

//     // Mint some tokens to treasury ATA first so there's something to withdraw
//     await mintTo(
//       provider.connection,
//       user,
//       solMint,
//       treasuryAta,
//       user.publicKey,
//       1_000 * 10 ** 9
//     );

//     await program.methods
//       .withdrawTreasury(new BN(500 * 10 ** 9))
//       .accountsStrict({
//         protocolState: protocolStatePda,
//         treasury: treasuryPda,
//         treasuryAta: treasuryAta,
//         recipientAta: userSolAta,
//         mint: solMint,
//         authority: authority,
//         tokenProgram: TOKEN_PROGRAM_ID,
//       })
//       .rpc();

//     const recipientSolAfter = (await getAccount(provider.connection, userSolAta)).amount;
//     assert.strictEqual(
//       recipientSolAfter - recipientSolBefore,
//       BigInt(500 * 10 ** 9)
//     );
//   });
// });

import * as anchor from "@coral-xyz/anchor";
import { Program, BN, web3 } from "@coral-xyz/anchor";
import { Liilend } from "../target/types/liilend";
import { assert } from "chai";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const PROTOCOL_SEED = Buffer.from("liilend-protocol");
const TREASURY_SEED = Buffer.from("liilend-treasury");
const VAULT_SEED = Buffer.from("liilend-vault");
const USER_SEED = Buffer.from("liilend-user");
const PRICE_FEED_SEED = Buffer.from("liilend-price-feed");
const BORROW_SEED = Buffer.from("liilend-borrow");

async function createAta(
  connection: web3.Connection,
  payer: web3.Keypair,
  mint: web3.PublicKey,
  owner: web3.PublicKey,
  allowOwnerOffCurve = false
): Promise<web3.PublicKey> {
  const ata = getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve);
  const tx = new web3.Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      ata,
      owner,
      mint
    )
  );
  await web3.sendAndConfirmTransaction(connection, tx, [payer]);
  return ata;
}

describe("LiiLend Protocol Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Liilend as Program<Liilend>;

  const authority = provider.wallet.publicKey;
  const user = anchor.web3.Keypair.generate();
  const liquidator = anchor.web3.Keypair.generate();
  const attacker = anchor.web3.Keypair.generate();
  const newAuthority = anchor.web3.Keypair.generate();

  let protocolStatePda: web3.PublicKey;
  let treasuryPda: web3.PublicKey;

  let solMint: web3.PublicKey;
  let usdcMint: web3.PublicKey;

  let solVaultPda: web3.PublicKey;
  let usdcVaultPda: web3.PublicKey;

  let solPriceFeedPda: web3.PublicKey;
  let usdcPriceFeedPda: web3.PublicKey;

  let solVaultAta: web3.PublicKey;
  let usdcVaultAta: web3.PublicKey;
  let treasuryAta: web3.PublicKey;

  let userSolAta: web3.PublicKey;
  let userUsdcAta: web3.PublicKey;
  let liquidatorUsdcAta: web3.PublicKey;

  let userAccountPda: web3.PublicKey;
  let userSolCollateralPda: web3.PublicKey;
  let userUsdcBorrowPda: web3.PublicKey;
  let userUsdcBorrowPositionPda: web3.PublicKey;

  async function expectFailure(fn: () => Promise<any>, expected: string) {
    try {
      await fn();
      assert.fail("Expected transaction failure");
    } catch (err: any) {
      assert.include(err.toString(), expected);
    }
  }

  before(async () => {
    for (const kp of [user, liquidator, attacker, newAuthority]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          kp.publicKey,
          20 * web3.LAMPORTS_PER_SOL
        ),
        "confirmed"
      );
    }

    [protocolStatePda] = web3.PublicKey.findProgramAddressSync(
      [PROTOCOL_SEED],
      program.programId
    );

    [treasuryPda] = web3.PublicKey.findProgramAddressSync(
      [TREASURY_SEED],
      program.programId
    );

    solMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      9
    );

    usdcMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6
    );

    [solVaultPda] = web3.PublicKey.findProgramAddressSync(
      [VAULT_SEED, solMint.toBuffer()],
      program.programId
    );

    [usdcVaultPda] = web3.PublicKey.findProgramAddressSync(
      [VAULT_SEED, usdcMint.toBuffer()],
      program.programId
    );

    [solPriceFeedPda] = web3.PublicKey.findProgramAddressSync(
      [PRICE_FEED_SEED, solMint.toBuffer()],
      program.programId
    );

    [usdcPriceFeedPda] = web3.PublicKey.findProgramAddressSync(
      [PRICE_FEED_SEED, usdcMint.toBuffer()],
      program.programId
    );

    [userAccountPda] = web3.PublicKey.findProgramAddressSync(
      [USER_SEED, user.publicKey.toBuffer()],
      program.programId
    );

    [userSolCollateralPda] = web3.PublicKey.findProgramAddressSync(
      [USER_SEED, user.publicKey.toBuffer(), solMint.toBuffer()],
      program.programId
    );

    [userUsdcBorrowPda] = web3.PublicKey.findProgramAddressSync(
      [USER_SEED, user.publicKey.toBuffer(), usdcMint.toBuffer()],
      program.programId
    );

    [userUsdcBorrowPositionPda] = web3.PublicKey.findProgramAddressSync(
      [BORROW_SEED, user.publicKey.toBuffer(), usdcMint.toBuffer()],
      program.programId
    );

    userSolAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user,
        solMint,
        user.publicKey
      )
    ).address;

    userUsdcAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user,
        usdcMint,
        user.publicKey
      )
    ).address;

    liquidatorUsdcAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        liquidator,
        usdcMint,
        liquidator.publicKey
      )
    ).address;

    solVaultAta = await createAta(
      provider.connection,
      user,
      solMint,
      solVaultPda,
      true
    );

    usdcVaultAta = await createAta(
      provider.connection,
      user,
      usdcMint,
      usdcVaultPda,
      true
    );

    treasuryAta = await createAta(
      provider.connection,
      user,
      usdcMint,
      treasuryPda,
      true
    );

    await mintTo(
      provider.connection,
      user,
      solMint,
      userSolAta,
      user.publicKey,
      10_000 * 10 ** 9
    );

    await mintTo(
      provider.connection,
      user,
      usdcMint,
      userUsdcAta,
      user.publicKey,
      100_000 * 10 ** 6
    );

    await mintTo(
      provider.connection,
      user,
      usdcMint,
      liquidatorUsdcAta,
      user.publicKey,
      50_000 * 10 ** 6
    );
  });

  describe("Protocol Initialization", () => {
    it("Initializes protocol", async () => {
      await program.methods
        .initProtocol()
        .accountsStrict({
          protocolState: protocolStatePda,
          treasury: treasuryPda,
          payer: authority,
          authority,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      const state = await program.account.protocolState.fetch(protocolStatePda);

      assert.equal(state.authority.toBase58(), authority.toBase58());
      assert.equal(state.paused, false);
      assert.equal(state.assetCount, 0);
    });
  });

  describe("Asset Configuration", () => {
    it("Configures SOL collateral asset", async () => {
      await program.methods
        .configureAsset(
          0,
          { both: {} },
          5000,
          5500,
          500,
          1000,
          new BN(100_000 * 10 ** 9),
          new BN(0),
          { pyth: {} },
          web3.PublicKey.default,
          web3.PublicKey.default
        )
        .accountsStrict({
          protocolState: protocolStatePda,
          vault: solVaultPda,
          priceFeed: solPriceFeedPda,
          mint: solMint,
          payer: authority,
          authority,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      const vault = await program.account.vaultAccount.fetch(solVaultPda);

      assert.equal(vault.assetMint.toBase58(), solMint.toBase58());
    });

    it("Configures USDC borrow asset", async () => {
      await program.methods
        .configureAsset(
          1,
          { both: {} },
          8000,
          8500,
          500,
          1000,
          new BN(1_000_000 * 10 ** 6),
          new BN(500_000 * 10 ** 6),
          { pyth: {} },
          web3.PublicKey.default,
          web3.PublicKey.default
        )
        .accountsStrict({
          protocolState: protocolStatePda,
          vault: usdcVaultPda,
          priceFeed: usdcPriceFeedPda,
          mint: usdcMint,
          payer: authority,
          authority,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
    });
  });

  describe("Oracle Management", () => {
    it("Updates SOL price feed", async () => {
      await program.methods
        .setPriceFeed(
          new BN(100_000_000_000),
          8,
          new BN(1_000_000),
          new BN(100_500_000_000)
        )
        .accountsStrict({
          protocolState: protocolStatePda,
          priceFeed: solPriceFeedPda,
          pythPriceAccount: web3.PublicKey.default,
          switchboardPriceAccount: web3.PublicKey.default,
          assetMint: solMint,
          authority,
        })
        .rpc();

      const feed = await program.account.priceFeed.fetch(solPriceFeedPda);

      assert.equal(feed.isValid, true);
      assert.equal(feed.decimals, 8);
    });
  });

  describe("Collateral Operations", () => {
    it("Deposits SOL collateral", async () => {
      const depositAmount = new BN(100 * 10 ** 9);

      const before = await getAccount(provider.connection, userSolAta);

      await program.methods
        .depositCollateral(depositAmount)
        .accountsStrict({
          protocolState: protocolStatePda,
          vault: solVaultPda,
          userCollateral: userSolCollateralPda,
          userAccount: userAccountPda,
          vaultAta: solVaultAta,
          userAta: userSolAta,
          assetMint: solMint,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const after = await getAccount(provider.connection, userSolAta);

      assert.equal(
        before.amount - after.amount,
        BigInt(depositAmount.toString())
      );
    });

    it("Rejects zero deposit", async () => {
      await expectFailure(async () => {
        await program.methods
          .depositCollateral(new BN(0))
          .accountsStrict({
            protocolState: protocolStatePda,
            vault: solVaultPda,
            userCollateral: userSolCollateralPda,
            userAccount: userAccountPda,
            vaultAta: solVaultAta,
            userAta: userSolAta,
            assetMint: solMint,
            authority: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([user])
          .rpc();
      }, "ZeroAmount");
    });

    it("Withdraws collateral", async () => {
      const vault = await program.account.vaultAccount.fetch(solVaultPda);

      const shares = vault.totalShares.div(new BN(2));

      await program.methods
        .withdrawCollateral(shares)
        .accountsStrict({
          protocolState: protocolStatePda,
          vault: solVaultPda,
          userCollateral: userSolCollateralPda,
          userAccount: userAccountPda,
          vaultAta: solVaultAta,
          userAta: userSolAta,
          assetMint: solMint,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    });
  });

  describe("Borrowing", () => {
    before(async () => {
      await program.methods
        .depositCollateral(new BN(2_000 * 10 ** 6))
        .accountsStrict({
          protocolState: protocolStatePda,
          vault: usdcVaultPda,
          userCollateral: userUsdcBorrowPda,
          userAccount: userAccountPda,
          vaultAta: usdcVaultAta,
          userAta: userUsdcAta,
          assetMint: usdcMint,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    });

    it("Borrows USDC against SOL", async () => {
      await program.methods
        .borrowAsset(new BN(100 * 10 ** 6))
        .accountsStrict({
          protocolState: protocolStatePda,
          vault: usdcVaultPda,
          userAccount: userAccountPda,
          borrowPosition: userUsdcBorrowPositionPda,
          vaultAta: usdcVaultAta,
          userAta: userUsdcAta,
          borrowMint: usdcMint,
          collateralPriceFeed: solPriceFeedPda,
          borrowPriceFeed: usdcPriceFeedPda,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const borrow = await program.account.borrowPosition.fetch(
        userUsdcBorrowPositionPda
      );

      assert(borrow.debtShares.gt(new BN(0)));
    });

    it("Rejects over-LTV borrow", async () => {
      await expectFailure(async () => {
        await program.methods
          .borrowAsset(new BN(2_000 * 10 ** 6))
          .accountsStrict({
            protocolState: protocolStatePda,
            vault: usdcVaultPda,
            userAccount: userAccountPda,
            borrowPosition: userUsdcBorrowPositionPda,
            vaultAta: usdcVaultAta,
            userAta: userUsdcAta,
            borrowMint: usdcMint,
            collateralPriceFeed: solPriceFeedPda,
            borrowPriceFeed: usdcPriceFeedPda,
            authority: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([user])
          .rpc();
      }, "InsufficientLiquidity");
    });

    it("Repays debt", async () => {
      await program.methods
        .repayDebt(new BN(100 * 10 ** 6))
        .accountsStrict({
          protocolState: protocolStatePda,
          vault: usdcVaultPda,
          borrowPosition: userUsdcBorrowPositionPda,
          userAccount: userAccountPda,
          vaultAta: usdcVaultAta,
          userAta: userUsdcAta,
          repayMint: usdcMint,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const borrow = await program.account.borrowPosition.fetch(
        userUsdcBorrowPositionPda
      );

      assert(borrow.debtShares.eq(new BN(0)));
    });
    });

    describe("Liquidations", () => {
      it("Liquidates underwater position", async () => {
        await program.methods
          .borrowAsset(new BN(900 * 10 ** 6))
          .accountsStrict({
            protocolState: protocolStatePda,
            vault: usdcVaultPda,
            userAccount: userAccountPda,
            borrowPosition: userUsdcBorrowPositionPda,
            vaultAta: usdcVaultAta,
            userAta: userUsdcAta,
            borrowMint: usdcMint,
            collateralPriceFeed: solPriceFeedPda,
            borrowPriceFeed: usdcPriceFeedPda,
            authority: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        await program.methods
          .liquidatePosition(new BN(50 * 10 ** 6))
          .accountsStrict({
            protocolState: protocolStatePda,
            treasury: treasuryPda,
            collateralVault: solVaultPda,
            borrowVault: usdcVaultPda,
            liquidateeAccount: userAccountPda,
            liquidateeCollateral: userSolCollateralPda,
            liquidateeBorrow: userUsdcBorrowPositionPda,
            collateralVaultAta: solVaultAta,
            borrowVaultAta: usdcVaultAta,
            liquidatorAta: liquidatorUsdcAta,
            collateralMint: solMint,
            borrowMint: usdcMint,
            liquidatee: user.publicKey,
            liquidator: liquidator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([liquidator])
          .rpc();
      });
    });

    describe("Pause Controls", () => {
      it("Pauses protocol", async () => {
        await program.methods
          .setPaused(true)
          .accountsStrict({
            protocolState: protocolStatePda,
            authority,
          })
          .rpc();

        const state = await program.account.protocolState.fetch(protocolStatePda);

        assert.equal(state.paused, true);
      });

      it("Rejects deposit while paused", async () => {
        await expectFailure(async () => {
          await program.methods
            .depositCollateral(new BN(1 * 10 ** 9))
            .accountsStrict({
              protocolState: protocolStatePda,
              vault: solVaultPda,
              userCollateral: userSolCollateralPda,
              userAccount: userAccountPda,
              vaultAta: solVaultAta,
              userAta: userSolAta,
              assetMint: solMint,
              authority: user.publicKey,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId,
            })
            .signers([user])
            .rpc();
        }, "ProtocolPaused");
      });

      it("Unpauses protocol", async () => {
        await program.methods
          .setPaused(false)
          .accountsStrict({
            protocolState: protocolStatePda,
            authority,
          })
          .rpc();
      });
    });

    describe("Authority Management", () => {
      it("Transfers authority", async () => {
        await program.methods
          .transferAuthority()
          .accountsStrict({
            protocolState: protocolStatePda,
            authority,
            newAuthority: newAuthority.publicKey,
          })
          .signers([newAuthority])
          .rpc();

        const state = await program.account.protocolState.fetch(protocolStatePda);

        assert.equal(
          state.proposedAuthority.toBase58(),
          newAuthority.publicKey.toBase58()
        );
      });

      it("Rejects unauthorized authority acceptance", async () => {
        await expectFailure(async () => {
          await program.methods
            .acceptAuthority()
            .accountsStrict({
              protocolState: protocolStatePda,
              authority: attacker.publicKey,
            })
            .signers([attacker])
            .rpc();
        }, "UnauthorizedAccess");
      });

      it("Accepts authority", async () => {
        await program.methods
          .acceptAuthority()
          .accountsStrict({
            protocolState: protocolStatePda,
            authority: newAuthority.publicKey,
          })
          .signers([newAuthority])
          .rpc();

        const state = await program.account.protocolState.fetch(protocolStatePda);

        assert.equal(
          state.authority.toBase58(),
          newAuthority.publicKey.toBase58()
        );
      });

      it("Transfers authority back", async () => {
        await program.methods
          .transferAuthority()
          .accountsStrict({
            protocolState: protocolStatePda,
            authority: newAuthority.publicKey,
            newAuthority: authority,
          })
          .signers([newAuthority])
          .rpc();

        await program.methods
          .acceptAuthority()
          .accountsStrict({
            protocolState: protocolStatePda,
            authority,
          })
          .rpc();

        const state = await program.account.protocolState.fetch(protocolStatePda);

        assert.equal(state.authority.toBase58(), authority.toBase58());
      });
    });

    describe("Treasury", () => {
      it("Collects fees", async () => {
        await program.methods
          .collectFees()
          .accountsStrict({
            protocolState: protocolStatePda,
            treasury: treasuryPda,
            authority,
          })
          .rpc();
      });

      it("Withdraws treasury funds", async () => {
        await mintTo(
          provider.connection,
          user,
          usdcMint,
          treasuryAta,
          user.publicKey,
          1_000 * 10 ** 6
        );

        const before = await getAccount(provider.connection, userUsdcAta);

        await program.methods
          .withdrawTreasury(new BN(500 * 10 ** 6))
          .accountsStrict({
            protocolState: protocolStatePda,
            treasury: treasuryPda,
            treasuryAta,
            recipientAta: userUsdcAta,
            mint: usdcMint,
            authority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        const after = await getAccount(provider.connection, userUsdcAta);

        assert.equal(
          after.amount - before.amount,
          BigInt(500 * 10 ** 6)
        );
      });
    });
  });