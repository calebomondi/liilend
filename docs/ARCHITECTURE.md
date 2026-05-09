# LiiLend Architecture

## Overview

LiiLend is a pooled-collateral vault protocol on Solana that abstracts DeFi complexity behind a fiat-first UX. Users deposit crypto as collateral and borrow stablecoins displayed in local fiat currency.

## Core Architecture Decisions

### 1. Pooled Vault Model
Unlike peer-to-pool lending (Aave, marginfi), LiiLend uses a **pooled intermediary** architecture:
- User deposits go into a protocol-owned vault
- LiiLend then re-deposits into external protocols (marginfi, Save Finance) via CPI
- Internal share accounting tracks each user's proportional ownership
- This allows LiiLend to enforce stricter risk parameters than the underlying protocols

### 2. Fiat Abstraction Layer
Users interact entirely in fiat terms:
- Select "Borrow KES 10,000"
- System converts KES → USDC using oracle-backed FX rates
- Actual on-chain debt is in USDC/USDT
- UI displays everything in user's chosen fiat

### 3. Risk Engine
LiiLend maintains its own risk parameters independent of underlying protocols:
- Internal LTV = external protocol LTV - 10% buffer
- Internal liquidation threshold = external - 10% buffer
- Dynamic health factor monitoring
- This protects against: oracle volatility, protocol insolvency, cascading liquidations

## Data Flow

### Deposit Flow
```
User → Deposit SOL → LiiLend Vault → CPI → marginfi/Save
                                           ↓
                                    Internal shares minted
                                           ↓
                                    User shares tracked in UserCollateralAccount
```

### Borrow Flow
```
User → Request KES 10,000
         ↓
    FX Service: KES → USDC
         ↓
    LiiLend checks: LTV ≤ 70%, Health Factor > 1
         ↓
    USDC transferred from vault to user
         ↓
    Debt shares created in BorrowPosition
```

### Liquidation Flow
```
Monitor checks Health Factor < 1.05
         ↓
    Liquidator calls liquidate_position()
         ↓
    Liquidator repays debt → receives collateral + 5% bonus
         ↓
    Position closed or partially reduced
```

## Pool Accounting

### Deposit Shares
```
shares = amount * total_shares / total_value
```
When depositing, user receives shares proportional to the pool. If no shares exist yet, shares = amount * SHARE_MULTIPLIER (1e9).

### Debt Shares
```
debt_shares = amount * total_debt_shares / total_borrows_usd
```
Similar mechanism for tracking borrow positions through time, allowing interest accrual.

## CPI Integration Architecture

The protocol supports pluggable CPI adapters:

```rust
pub trait ProtocolAdapter {
    fn deposit(ctx, amount) -> Result;
    fn withdraw(ctx, shares) -> Result;
    fn borrow(ctx, amount) -> Result;
    fn repay(ctx, amount) -> Result;
}
```

Currently implemented:
- `MarginFiAdapter` - CPI to marginfi program
- `SaveAdapter` - CPI to Save Finance (Solend)

Future adapters can be added without modifying core vault logic.

## Oracle Architecture

Two-tier oracle system:
1. **Primary**: Pyth Network (real-time price feeds)
2. **Fallback**: Switchboard (backup oracle)

Price validation:
- Staleness check: price must be updated within 60 seconds
- Confidence interval check: price must have reasonable confidence
- Cross-reference: if both oracles report, compare for divergence

## Supported Chains (LI.FI Bridge)

| Chain | Bridge Support |
|-------|---------------|
| Solana | Native |
| Ethereum | LI.FI → Wormhole/CCIP |
| Base | LI.FI → Wormhole |
| Arbitrum | LI.FI → Wormhole |
| Polygon | LI.FI → Wormhole |

## Future Expansion

The architecture is designed for:
- **AI Agents**: Programmatic position management via CPI
- **Autonomous Rebalancing**: Auto-migrate funds between marginfi/Save for best rates
- **Credit Scoring**: On-chain reputation for uncollateralized loans
- **DAO Governance**: Protocol parameter voting
- **Cross-chain**: Multi-VM vault management
