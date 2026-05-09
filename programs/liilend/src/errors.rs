use anchor_lang::prelude::*;

#[error_code]
pub enum LiiLendError {
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Borrow exceeds max LTV")]
    BorrowExceedsMaxLTV,
    #[msg("Position is liquidatable")]
    PositionLiquidatable,
    #[msg("Invalid oracle price")]
    InvalidOraclePrice,
    #[msg("Stale oracle price")]
    StaleOraclePrice,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    #[msg("Pool is full")]
    PoolFull,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
    #[msg("Invalid collateral asset")]
    InvalidCollateralAsset,
    #[msg("Invalid borrow asset")]
    InvalidBorrowAsset,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Account already initialized")]
    AlreadyInitialized,
    #[msg("Account not initialized")]
    NotInitialized,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Minimum deposit not met")]
    MinimumDepositNotMet,
    #[msg("Repayment exceeds debt")]
    RepaymentExceedsDebt,
    #[msg("Invalid fee configuration")]
    InvalidFeeConfig,
    #[msg("Treasury operation failed")]
    TreasuryOperationFailed,
    #[msg("CPI call failed")]
    CPICallFailed,
    #[msg("Oracle price unavailable")]
    OraclePriceUnavailable,
    #[msg("Liquidation threshold not reached")]
    LiquidationThresholdNotReached,
    #[msg("No debt to liquidate")]
    NoDebtToLiquidate,
    #[msg("Protocol insolvent")]
    ProtocolInsolvent,
    #[msg("Share calculation overflow")]
    ShareCalculationOverflow,
    #[msg("Invalid share conversion")]
    InvalidShareConversion,
    #[msg("Deposit cap reached for asset")]
    DepositCapReached,
    #[msg("Exchange rate unavailable")]
    ExchangeRateUnavailable,
    #[msg("Borrow cap reached")]
    BorrowCapReached,
    #[msg("Withdrawal locked - cooldown active")]
    WithdrawalLocked,
    #[msg("Invalid protocol integration")]
    InvalidProtocolIntegration,
    #[msg("Fallback protocol unavailable")]
    FallbackProtocolUnavailable,
}
