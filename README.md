# LiiLend

**Borrow local currency against your crypto.**

LiiLend is a crypto-collateralized borrowing platform focused on Africa and emerging markets. Users deposit crypto assets as collateral and borrow stablecoins, with the UX abstracted into local fiat currency (KES, NGN, GHS, ZAR).

## Status

| Component | Status |
|-----------|--------|
| Solana Program (Anchor) | Deployed on devnet |
| Frontend (Next.js 15) | Builds and runs |
| Backend (Express) | Running with all services |
| Integration Tests | 5/5 operations passing |
| CPI Unit Tests | 22/22 passing |
| Supabase (PostgreSQL) | Schema applied, connected |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile-First Web App                 │
│  (Next.js + Tailwind + Wallet Adapter + React Query)    |
├─────────────────────────────────────────────────────────┤
│                    TypeScript SDK/Lib                   │
│  (LI.FI Bridge | Fiat Abstraction | Oracle | Protocol)  │
├──────────────────────┬──────────────────────────────────┤
│   Backend/API Layer  │    Solana Program (Anchor)       │
│   (Express + TS)     │    LiiLend Vault Contract        │
│                      │                                  │
│   • FX Service       │    • Pool Accounting             │
│   • Indexer          │    • Deposit/Withdraw            │
│   • Liq. Monitor     │    • Borrow/Repay                │
│   • Portfolio Agg.   │    • Liquidation                 │
│   • Analytics        │    • Risk Engine                 │
├──────────────────────┴──────────────────────────────────┤
│                 External Integrations                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │ marginfi │  │    Save  │  │  x402    │  │  Pyth   │  │
│  │          │  │  Finance │  │ Protocol │  │ Oracle  │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │Switchbd. │  │  Transak │  │ Stables  │               │
│  │  Oracle  │  │ On-Ramp  │  │ Off-Ramp │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────┘
```

## Contract Deployment Addresses

All addresses are on **Solana Devnet**.

### Core Protocol

| Account | Address |
|---------|---------|
| Program ID | `LiiLryA3sZtz3Qeuo3YjZE5tdq4zK6zHMPpwfHNqB8v` |
| ProtocolState PDA | `49znTcGkBaBtb2DT538sDXxGoqwECbTUR42w5N9AvJWy` |
| Treasury | `zuqKDoMubUFxmHdRMd7sn8bqs8recHA14zd3ftjGqyM` |
| Deployer Wallet | `BbK6G2WG2i8LVdMYwRrsT5aaB4QRuvBzdTrFYkQSd2CV` |

### Asset Vaults

| Asset | Vault PDA |
|-------|-----------|
| SOL Vault | `B4kmiYrVkTPtUYaoZyuPkrCAjXx2U4p772XdmHiV6BDA` |
| USDC Vault | `3UDVJRx2bgJAXyVcWeSx5LtCZqEb3kY2M13ZWe9yb4jQ` |

### Devnet Token Mints

| Token | Mint Address |
|-------|-------------|
| SOL (native) | `So11111111111111111111111111111111111111112` |
| USDC | `F88tFzVdURKCKzLWqGAu9omz5GsHAURbGcrrL4EK8CKZ` |
| USDT | `FHRiYWEh6Uzr8oc2i8TC29CVRTxYhkRkuSrmuFb67hjX` |
| jitoSOL | `H6khZJNhsAj3RNPrqUbVsYZUd2HFxeAQPrTXokuH57PZ` |
| ETH (Wormhole) | `2b8PYsqmHcCHqM8JzvSf4CPuRxvZzaCbPx9PuENYQ9vB` |
| BTC (Wormhole) | `CSQNTS5NCT6o3GsWt5gtkvW14tCVe9fpqdcQmepCBSAg` |
| mSOL (Marinade) | `mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So` |

### Oracle Price Feeds (Pyth)

| Asset | Price Feed Account |
|-------|-------------------|
| SOL | `H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG` |
| USDC/USDT | `Dpw1EAVrSB1ibY1AStoA9C2yKF8F5wJNtBy2jVfXNU8V` |
| jitoSOL | `7LwM3FQ4KvSfakMRscKDN6FjYFyFJ3MgjPmSm3KeCqKJ` |
| mSOL | `E4v1BBgYvKYToBiK6BFSETiEGmwTThNTEKZxKeKqYbTe` |
| ETH | `JBu1AL4obBcCMgKvT2jWgYbR3bHjQkE5K8KxtH6Vx8H` |
| BTC | `Hr8Q8YJ6Uo3K5aY3G7bXMd3iJG9TjJxVdFm5YqUMgJF6` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Anchor Framework 0.32.1 (Rust 1.95.0) |
| Frontend | Next.js 15, TypeScript 6, Tailwind CSS |
| Backend | Node.js 24, Express, TypeScript |
| Wallet | @solana/wallet-adapter (Phantom, Backpack, Solflare) |
| Solana SDK | @solana/web3.js 1.98, @solana/spl-token 0.4 |
| RPC | Solana devnet (Helius-compatible) |
| Oracles | Pyth Network, Switchboard |
| Bridge | x402 Protocol (@x402/svm) |
| On/Off-Ramp | Transak, Stables |
| Indexing | Supabase / PostgreSQL |
| Queue | Bull + Redis |
| Container | Docker / Docker Compose |

## Project Structure

```
liilend/
├── programs/liilend/           # Anchor smart contract
│   └── src/
│       ├── lib.rs              # Program entrypoint
│       ├── state.rs            # Account state definitions
│       ├── errors.rs           # Custom error codes
│       ├── instructions/       # Instruction handlers
│       │   ├── init_protocol.rs
│       │   ├── configure_asset.rs
│       │   ├── deposit.rs
│       │   ├── withdraw.rs
│       │   ├── borrow.rs
│       │   ├── repay.rs
│       │   ├── liquidate.rs
│       │   ├── set_price_feed.rs
│       │   ├── treasury_ops.rs
│       │   └── admin.rs
│       ├── cpi/                # CPI integration adapters
│       │   ├── mod.rs          # Dispatch routing by protocol
│       │   ├── marginfi_adapter.rs  # marginfi v2 CPI (real invoke_signed)
│       │   └── save_adapter.rs      # Save Finance CPI (real invoke_signed)
│       └── utils/              # Math & accounting helpers
│           ├── math.rs
│           ├── safe_math.rs
│           └── share_math.rs
├── app/                        # Next.js frontend
│   └── src/
│       ├── app/                # Pages & API routes
│       │   ├── page.tsx        # Dashboard (protocol stats, read-only mode)
│       │   ├── borrow/page.tsx  # Deposit + borrow UI
│       │   ├── portfolio/page.tsx # User portfolio
│       │   └── api/risk/route.ts # x402-protected Risk Oracle API
│       ├── components/         # Reusable UI components
│       ├── hooks/              # React hooks (useProgram, etc.)
│       ├── lib/                # Integration libraries
│       │   ├── risk-oracle.ts  # On-chain risk data reader (server-side)
│       │   ├── onramp.ts       # Fiat on/off-ramp
│       │   ├── fiat.ts         # Fiat abstraction layer
│       │   ├── oracle.ts       # Oracle integration
│       │   └── protocol.ts     # Protocol helpers (PDA derivation)
│       └── types/              # TypeScript definitions
├── backend/                    # Backend services
│   └── src/
│       ├── services/
│       │   ├── fx-service.ts   # FX rate oracle + caching
│       │   ├── indexer.ts      # On-chain event indexer
│       │   ├── liquidation-monitor.ts # Health factor scanner
│       │   └── portfolio-service.ts   # Portfolio aggregation
│       ├── routes/
│       │   └── api.ts          # REST API (analytics, notifications, protocol)
│       ├── middleware/
│       │   └── auth.ts         # JWT auth + message signing
│       ├── config/
│       │   └── index.ts        # Environment configuration
│       └── types/
│           └── index.ts        # Shared type definitions
├── scripts/                    # Deployment & admin scripts
│   ├── deploy-devnet.sh        # Full deployment pipeline
│   ├── initialize-protocol.ts  # Init protocol + treasury
│   ├── setup-test-wallets.ts   # Create test wallets + airdrop
│   ├── test-devnet.ts          # End-to-end integration test
│   ├── verify-deployment.ts    # Verify all accounts exist
│   ├── airdrop-devnet.ts       # Request devnet SOL
│   └── constants.ts            # Shared devnet addresses
├── tests/                      # Anchor integration tests (20 tests)
├── target/idl/                 # Compiled IDL JSON
│   └── liilend.json            # 2800-line IDL (13 instructions)
├── Dockerfile
└── docker-compose.yml
```

## Smart Contract

The LiiLend Anchor program manages a pooled-vault lending protocol with 13 instructions.

### CPI Integration (marginfi v2 + Save Finance)

Vaults can be configured with a `ProtocolIntegration` (MarginFi or SaveFinance). When `ctx.remaining_accounts` is non-empty, the deposit/withdraw/borrow/repay handlers dispatch a real `invoke_signed` CPI call to the upstream protocol after token transfers. The vault PDA signs as the upstream protocol's authority.

**Account layout in `remaining_accounts`:**

| Index | Role |
|-------|------|
| `[0]` | Vault authority PDA (signer) |
| `[1..N-1]` | Protocol-specific accounts (program, group, bank, reserves, etc.) |
| `[N-1]` | Destination/source ATA (borrow/repay) |

**Protocols:**

| Protocol | Program ID | Discriminator |
|----------|-----------|--------------|
| Marginfi v2 | `MFv2hWfSl8SXyFSJtTn4eBjbZ3kYkG6KxJKsWmT1Qj9` | Anchor 8-byte (`sha256("global:<fn>")[..8]`) |
| Save Finance | `So1endDq2YkqEjRh1dFGS7HVk25Ksfx4bNq3F7eG7Y` | Tag-based (1-byte opcode) |

CPI is skipped when `remaining_accounts` is empty — existing deployments without CPI adapters continue to work unchanged.

### Accounts

| Account | Description |
|---------|-------------|
| `ProtocolState` | Global protocol config, paused state, treasury reference |
| `VaultAccount` | Per-asset vault tracking shares and deposited value |
| `UserAccount` | Per-user aggregate position summary |
| `UserCollateralAccount` | Per-user, per-asset collateral deposit tracking |
| `BorrowPosition` | Per-user, per-asset borrow debt tracking |
| `PriceFeed` | Oracle price storage per asset |
| `TreasuryAccount` | Fee accumulation and insurance fund |

### Instructions

| Instruction | Description |
|------------|-------------|
| `init_protocol` | Initialize protocol state and treasury |
| `configure_asset` | Register new collateral/borrow asset |
| `deposit_collateral` | Deposit tokens, mint shares |
| `withdraw_collateral` | Redeem shares for underlying tokens |
| `borrow_asset` | Borrow against collateral with LTV check |
| `repay_debt` | Repay borrow position |
| `liquidate_position` | Liquidate underwater positions |
| `set_price_feed` | Update oracle price |
| `withdraw_treasury` | Admin treasury withdrawal |
| `collect_fees` | Collect accrued protocol fees |
| `set_paused` | Emergency pause control |
| `transfer_authority` | Multi-step authority transfer |
| `update_asset_config` | Update asset risk parameters |

### Risk Engine

- Internal LTV = external LTV - 10% buffer
- Internal liquidation threshold = external - 10% buffer
- Dynamic health factor: `(collateralUsd * avgLiquidationThreshold) / debtUsd`
- Health Factor color coding: red (≤1.5), orange (1.5–2.0), green (≥2.0)
- Stale price protection (60-second threshold)
- Share-based accounting for fair distribution among depositors
- Pausable emergency controls

## Frontend

### Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with live protocol stats (TVL, utilization, total borrows) — works without wallet |
| `/borrow` | Deposit collateral + borrow assets (incl. health factor, Collateral/Borrowed cards) |
| `/portfolio` | View on-chain positions (4 health cards, Risk Analysis, Deposited Collateral) |
| `GET /api/risk` | x402-paywalled Risk Oracle — real-time vault health, TVL, liquidation thresholds |

### Key Features

- **Wallet connection** via `@solana/wallet-adapter` (Phantom, Backpack, Solflare)
- **Read-only mode** — protocol stats load without wallet connection (home page uses dummy AnchorProvider)
- **SOL wrapping** — automatic wSOL wrapping for SOL deposits
- **ATA creation** — idempotent associated token account creation
- **Real on-chain data** — all positions fetched via `getProgramAccounts` with Borsh decoding
- **Health Factor display** — color-coded (red ≤1.5, orange 1.5–2.0, green ≥2.0) across borrow & portfolio
- **Total Supply = cumulative deposits** — never decreases when borrowed (uses `ProtocolState.totalDepositsUsd`)
- **Mobile-first** responsive design with Tailwind CSS

### x402 Risk Oracle API

`GET /api/risk` — an x402-protected endpoint that returns real-time protocol risk data. Clients must pay a micro-fee in USDC (devnet) before receiving the response.

**Flow:**

```bash
# Step 1: Server returns 402 with payment requirements
curl -s http://localhost:3000/api/risk
→ 402 Payment Required
  PAYMENT-REQUIRED: base64({ payTo, amount: "1 USDC", network: "solana-devnet" })

# Step 2: Client signs payment and retries
curl -s -H 'PAYMENT-SIGNATURE: <base64 signed payload>' http://localhost:3000/api/risk
→ 200 { success, payment, data }
```

**Response data:**

| Field | Description |
|-------|-------------|
| `protocol.totalDepositsUsd` | Total deposits in USD |
| `protocol.totalBorrowsUsd` | Total borrows in USD |
| `protocol.utilizationRate` | Borrows / Deposits ratio |
| `vaults[]` | Per-collateral-asset: TVL, shares, raw value, price, LTV, liquidation threshold |
| `updatedAt` | ISO timestamp of the snapshot |

**Implementation:**

| File | Role |
|------|------|
| `app/src/app/api/risk/route.ts` | x402 handler — returns 402 on unpaid requests, verifies `PAYMENT-SIGNATURE`, serves risk data |
| `app/src/lib/risk-oracle.ts` | Server-side on-chain reader — fetches `ProtocolState` + `VaultAccount` via read-only Anchor Program |

**On devnet:**

- Merchant wallet is ephemeral (generated at startup) or set via `X402_MERCHANT_SECRET` env var
- Payment verification uses `@x402/svm` — decodes the signed Solana transaction from the payload and validates structure (`decodeTransactionFromPayload`, `getTokenPayerFromTransaction`)
- Devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

**Client usage:**

```typescript
import { x402Client } from "@x402/fetch";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";

const fetchWithPayment = new x402Client().register(
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  registerExactSvmScheme(client, { signer: toClientSvmSigner(signer) })
);
// fetchWithPayment handles 402 → sign → retry automatically
```

## Backend

### Services

| Service | Description |
|---------|-------------|
| **FX Service** | Fetches exchange rates from Switchboard oracle with fallback to free APIs |
| **Indexer** | Subscribes to program logs via `onLogs`, persists events to Supabase |
| **Liquidation Monitor** | Polls all active positions, flags underwater accounts |
| **Portfolio Service** | Aggregates user positions from on-chain accounts, computes health factors |
| **Analytics** | Queries Supabase for transaction counts, user activity |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/protocol/stats` | TVL, total borrows, utilization rate from ProtocolState |
| GET | `/api/portfolio/:address` | User portfolio with positions and health factor |
| GET | `/api/portfolio/:address/history` | Historical portfolio snapshots (requires Supabase) |
| GET | `/api/analytics/overview` | 30-day transaction and liquidation counts |
| POST | `/api/notifications/register` | Register for push notifications (requires Supabase) |
| GET | `/api/fx/rates` | Current FX rates |
| GET | `/api/fx/convert` | Convert between fiat currencies |
| POST | `/api/auth/login` | Sign-in with Solana wallet (signed message) |
| GET | `/api/fees` | Current fee estimates |

### Configuration

Key environment variables (see `backend/.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint |
| `PROGRAM_ID` | Yes | Deployed program ID |
| `SUPABASE_URL` | No | Supabase project URL (degraded mode if empty) |
| `SUPABASE_SERVICE_KEY` | No | Supabase service role key |
| `JWT_SECRET` | No | Auth signing key (dev default provided) |
| `FX_ORACLE_URL` | No | Switchboard oracle endpoint |
| `FX_FALLBACK_URLS` | No | Comma-separated fallback FX APIs |

## Prerequisites

- Rust 1.75+
- Solana CLI 1.18+
- Anchor CLI 0.32.1+
- Node.js 20+
- npm or yarn
- Docker (optional, for Redis + queue)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/calebomondi/liilend.git
cd liilend

# Install Anchor program dependencies (handled by Anchor)
# Install frontend
cd app && npm install && cd ..

# Install backend
cd backend && npm install && cd ..

# Install root scripts dependencies
npm install
```

### 2. Build the Anchor Program

```bash
anchor build
```

The compiled binary will be at `target/deploy/liilend.so` and the IDL at `target/idl/liilend.json`.

### 3. Configure Environment

**Frontend** (`app/.env.local`):

```bash
cd app
cp .env.example .env.local
# Edit .env.local with your RPC endpoint
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=LiiLryA3sZtz3Qeuo3YjZE5tdq4zK6zHMPpwfHNqB8v
```

**Backend** (`backend/.env`):

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=LiiLryA3sZtz3Qeuo3YjZE5tdq4zK6zHMPpwfHNqB8v
```

### 4. Deploy to Devnet

```bash
# 1. Deploy the program
./scripts/deploy-devnet.sh

# Or manually:
# anchor deploy --provider.cluster devnet

# 2. Initialize protocol state and treasury
npx tsx scripts/initialize-protocol.ts

# 3. Seed vaults with liquidity (required for borrowing)
npx tsx scripts/seed-vaults.ts

# 4. Configure all 7 assets
npx tsx scripts/setup-test-wallets.ts

# 4. Verify everything is deployed
npx tsx scripts/verify-deployment.ts
```

### 5. Run the Integration Test

```bash
# Full end-to-end test: deposit SOL → deposit USDC → borrow USDC → repay → withdraw
npx tsx scripts/test-devnet.ts

# Expected output:
#   [1/5] Depositing 100000000 SOL...                    ✓
#   [2/5] Depositing 10000000 USDC as vault seed...      ✓
#   [3/5] Borrowing 1000000 USDC...                      ✓
#   [4/5] Repaying 1000000 USDC...                       ✓
#   [5/5] Withdrawing all SOL...                         ✓
#   All operations completed successfully!
```

### 6. Start the Frontend

```bash
cd app
npm run dev
# → http://localhost:3000
```

### 7. Start the Backend

```bash
cd backend
npm run dev
# → http://localhost:4000
# Services: FX cache, Indexer (onLogs), Liquidation Monitor
```

### 8. Docker (Full Stack)

```bash
docker-compose up --build
```

## Supabase Setup

The backend uses Supabase/PostgreSQL for event indexing and historical data.

### Schema

The migration is at `backend/supabase/migrations/001_init.sql`. It creates 3 tables:

1. **`events`** — Protocol action log (deposits, borrows, repayments, liquidations)
2. **`notification_registrations`** — Push notification subscriptions
3. **`portfolio_history`** — Historical portfolio value snapshots

### Apply

1. Paste `backend/supabase/migrations/001_init.sql` into Supabase Dashboard → SQL Editor
2. Or run: `SUPABASE_URL=<url> SUPABASE_SERVICE_KEY=<key> psql < backend/supabase/migrations/001_init.sql`

### Verify

```bash
cd backend
npx tsx -r dotenv/config scripts/check-supabase-schema.ts
```

## Supported Assets

### Collateral

| Asset | Max LTV | Liquidation Threshold | Liquidation Penalty |
|-------|---------|----------------------|-------------------|
| SOL | 75% | 80% | 5% |
| mSOL | 70% | 75% | 5% |
| jitoSOL | 70% | 75% | 5% |
| ETH (Wormhole) | 70% | 75% | 5% |
| BTC (Wormhole) | 70% | 75% | 5% |

### Borrowable

| Asset | Utilization Cap |
|-------|----------------|
| USDC | 1,500,000 |
| USDT | 1,000,000 |

### Fiat Currencies

| Currency | Code | Rate to USD (approx) |
|----------|------|---------------------|
| Kenyan Shilling | KES | 0.0077 |
| Nigerian Naira | NGN | 0.00063 |
| Ghanaian Cedi | GHS | 0.064 |
| South African Rand | ZAR | 0.052 |
| US Dollar | USD | 1.0 |

## Testing

### Anchor Tests (Unit + Integration)

```bash
anchor test
# 22 Rust unit tests + Anchor integration tests covering: init, configure,
# deposit, withdraw, borrow, repay, liquidate, price feeds, authority transfer,
# edge cases, CPI discriminators, dispatch routing, instruction data construction
```

**CPI unit tests** (`cargo test`):

| Module | Tests | Coverage |
|--------|-------|----------|
| `marginfi_adapter.rs` | 6 | Discriminator verification, instruction data construction |
| `save_adapter.rs` | 6 | Tag constants, instruction data construction |
| `cpi/mod.rs` | 9 | Dispatch routing length checks for all 8 operation/protocol combos |
| `state.rs` | 1 | Program ID validation |

### Devnet Integration Test

```bash
npx tsx scripts/test-devnet.ts
```

### Backend Build

```bash
cd backend && npm run build
```

### Frontend Build

```bash
cd app && npm run build
```

## Security

- PDA-based authority management (no private keys in contracts)
- Two-step authority transfer (prevents accidental loss)
- Pausable emergency controls via `set_paused`
- CPI calls use `invoke_signed` with PDA-derived seeds — no arbitrary signer delegation
- CPI dispatch is isolated after token transfers (deposit) or before (withdraw) to minimize re-entrancy surface
- Account validation via `require!` on `remaining_accounts` length before any CPI call
- CPI errors are caught and mapped to protocol-level errors (no silent failures)
- Overflow/underflow protection (SafeMath, checked arithmetic)
- Stale price protection (60-second threshold rejects outdated feeds)
- Liquidation threshold buffers (10% below external protocol limits)
- Internal risk engine with conservative LTV parameters
- Share-based accounting prevents front-running and sandwich attacks
- Treasury/fee isolation through dedicated PDA accounts

## Troubleshooting

### "Account not found" when calling protocol

Ensure you've run `initialize-protocol.ts` after deployment. Check with `verify-deployment.ts`.

### "Missing required env var"

Backend falls back gracefully for Supabase (empty = degraded). For Solana RPC, ensure `SOLANA_RPC_URL` is set.

### Transaction simulation fails on devnet

- Ensure your wallet has devnet SOL (`solana airdrop 2` or use `scripts/airdrop-devnet.ts`)
- Verify the program ID in your `.env` matches the deployed program
- Check the devnet RPC is responsive — try `https://api.devnet.solana.com`

### Wallet connection issues

- Only Phantom, Backpack, and Solflare are supported
- Ensure `NEXT_PUBLIC_SOLANA_RPC_URL` is set correctly in `app/.env.local`
- The protocol works in read-only mode without a wallet

## License

MIT
