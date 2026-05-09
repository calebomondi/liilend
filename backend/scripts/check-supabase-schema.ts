/**
 * Verify Supabase tables exist.
 * Usage: SUPABASE_URL=<url> SUPABASE_SERVICE_KEY=<key> npx tsx scripts/check-supabase-schema.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

async function main() {
  const supabase = createClient(url, key);

  const tables = ["events", "notification_registrations", "portfolio_history"];
  let allOk = true;

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`✗ ${table}: ${error.message}`);
      allOk = false;
    } else {
      console.log(`✓ ${table}: accessible`);
    }
  }

  if (allOk) {
    console.log("\nAll tables OK.");
  } else {
    console.log("\nSome tables missing. Paste backend/supabase/migrations/001_init.sql into Supabase SQL Editor.");
  }
}

main().catch(console.error);
