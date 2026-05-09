-- LiiLend Backend — Supabase Schema
-- Run this in the Supabase SQL Editor or via the seed script.

/* ─── 1. Events (protocol activity log) ──────────────────── */

create table if not exists events (
  id        text primary key,                     -- "<signature>:<action>"
  signature text        not null,                 -- Solana tx signature
  slot      bigint      not null,                 -- slot number
  block_time timestamptz not null,                -- block timestamp
  action    text        not null,                 -- deposit|withdraw|borrow|repay|liquidate
  "user"    text        not null,                  -- wallet address
  market    text        not null,                 -- asset mint address
  amount    text        not null,                 -- raw amount (bigint serialized)
  amount_usd numeric    not null,                 -- USD value at time of event
  data      jsonb       not null default '{}'::jsonb -- full parsed event payload
);

create index if not exists idx_events_block_time  on events (block_time desc);
create index if not exists idx_events_action      on events (action);
create index if not exists idx_events_user   on events ("user");
create index if not exists idx_events_market      on events (market);

-- Check constraint for valid actions
alter table events add constraint chk_events_action
  check (action in ('deposit', 'withdraw', 'borrow', 'repay', 'liquidate'));


/* ─── 2. Notification Registrations ─────────────────────── */

create table if not exists notification_registrations (
  address   text        primary key,              -- wallet address
  channel   text        not null,                 -- email|telegram|webhook
  target    text        not null,                 -- destination (email, chat id, url)
  events    text[]      not null default '{}',    -- which actions to notify on
  enabled   boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notification_registrations add constraint chk_notif_channel
  check (channel in ('email', 'telegram', 'webhook'));


/* ─── 3. Portfolio History (snapshots over time) ────────── */

create table if not exists portfolio_history (
  id            bigserial    primary key,
  address       text         not null,
  timestamp     timestamptz  not null,
  deposited_usd numeric      not null default 0,
  borrowed_usd  numeric      not null default 0,
  net_worth_usd numeric      not null default 0
);

create index if not exists idx_portfolio_history_addr_time
  on portfolio_history (address, timestamp desc);
