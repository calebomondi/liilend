#!/usr/bin/env bash
set -euo pipefail

# ── LiiLend Devnet Deployment Script ──────────────────────────────────────────
# Usage:  ./scripts/deploy-devnet.sh
# Requires: anchor, solana CLI, jq

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[LiiLend]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ── Prerequisites ──────────────────────────────────────────────────────────────
for cmd in anchor solana jq; do
  if ! command -v $cmd &>/dev/null; then
    err "$cmd is required but not installed."
    exit 1
  fi
done

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Config ─────────────────────────────────────────────────────────────────────
CLUSTER="devnet"
PROGRAM_NAME="liilend"
PROGRAM_KEYPAIR="target/deploy/${PROGRAM_NAME}-keypair.json"
DEPLOYER_KEY="${SOLANA_KEYPAIR:-${HOME}/.config/solana/id.json}"

log "Deploying ${PROGRAM_NAME} to ${CLUSTER}"
log "Project root: ${PROJECT_ROOT}"
log "Deployer key: ${DEPLOYER_KEY}"

# ── Step 1: Build Program ─────────────────────────────────────────────────────
log "Building program..."
anchor build --program-name "${PROGRAM_NAME}"
ok "Build complete"

# ── Step 2: Generate program key if missing ───────────────────────────────────
if [ ! -f "${PROGRAM_KEYPAIR}" ]; then
  warn "Program keypair not found at ${PROGRAM_KEYPAIR}"
  log "Generating new program keypair..."
  solana-keygen new --no-bip39-passphrase --force -o "${PROGRAM_KEYPAIR}"
  ok "Program keypair generated"
else
  ok "Program keypair exists"
fi

PROGRAM_ID="$(solana-keygen pubkey "${PROGRAM_KEYPAIR}")"
log "Program ID: ${PROGRAM_ID}"

# ── Step 3: Ensure deployer has SOL ───────────────────────────────────────────
log "Checking deployer balance..."
BALANCE="$(solana balance --keypair "${DEPLOYER_KEY}" --url "${CLUSTER}" 2>/dev/null | awk '{print $1}')"
if [ -z "${BALANCE}" ] || [ "$(echo "${BALANCE} < 2.0" | bc -l)" = "1" ]; then
  log "Airdropping 5 SOL to deployer..."
  solana airdrop 5 "${DEPLOYER_KEY}" --url "${CLUSTER}" || true
  solana airdrop 5 "${DEPLOYER_KEY}" --url "${CLUSTER}" || true
  sleep 2
  NEW_BALANCE="$(solana balance --keypair "${DEPLOYER_KEY}" --url "${CLUSTER}" | awk '{print $1}')"
  ok "Deployer balance: ${NEW_BALANCE} SOL"
else
  ok "Deployer balance: ${BALANCE} SOL (sufficient)"
fi

# ── Step 4: Deploy to devnet ───────────────────────────────────────────────────
log "Deploying program to devnet..."
anchor deploy --program-name "${PROGRAM_NAME}" --provider.cluster "${CLUSTER}"
ok "Deployment successful"

# ── Step 5: Update Anchor.toml with program ID ────────────────────────────────
log "Updating Anchor.toml with program ID..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/liilend = \".*\"/liilend = \"${PROGRAM_ID}\"/" Anchor.toml
else
  sed -i "s/liilend = \".*\"/liilend = \"${PROGRAM_ID}\"/" Anchor.toml
fi
ok "Anchor.toml updated"

# ── Step 6: Write program ID to .env ──────────────────────────────────────────
ENV_FILE="${PROJECT_ROOT}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  cp "${PROJECT_ROOT}/.env.example" "${ENV_FILE}" 2>/dev/null || true
fi

if grep -q "^PROGRAM_ID=" "${ENV_FILE}" 2>/dev/null; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^PROGRAM_ID=.*/PROGRAM_ID=${PROGRAM_ID}/" "${ENV_FILE}"
  else
    sed -i "s/^PROGRAM_ID=.*/PROGRAM_ID=${PROGRAM_ID}/" "${ENV_FILE}"
  fi
else
  echo "PROGRAM_ID=${PROGRAM_ID}" >> "${ENV_FILE}"
fi

# ── Deployment Summary ─────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}LiiLend Deployment Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Cluster:    ${CYAN}${CLUSTER}${NC}"
echo -e "  Program ID: ${CYAN}${PROGRAM_ID}${NC}"
echo -e "  Deployer:   ${CYAN}${DEPLOYER_KEY}${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log "Next steps:"
log "  Run: npx ts-node scripts/initialize-protocol.ts"
log "  Run: npx ts-node scripts/seed-vaults.ts"
log "  Run: npx ts-node scripts/verify-deployment.ts"
log "  Run: npx ts-node scripts/setup-test-wallets.ts"
echo ""
