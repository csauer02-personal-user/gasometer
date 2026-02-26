import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const COSTS_FILE = process.env.COSTS_FILE ?? `${process.env.HOME}/.gt/costs.jsonl`;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BATCH_SIZE = 50;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function backfill() {
  const lines = readFileSync(COSTS_FILE, "utf-8").trim().split("\n");
  console.log(`Found ${lines.length} cost records to backfill`);

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE).map((line) => {
      const record = JSON.parse(line);
      return {
        session_id: record.session_id,
        role: record.role,
        worker: record.worker ?? null,
        rig: record.rig ?? null,
        cost_usd: record.cost_usd,
        ended_at: record.ended_at,
      };
    });

    const { error } = await supabase
      .from("cost_events")
      .upsert(batch, { onConflict: "session_id,ended_at" });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Backfill complete: ${inserted} inserted, ${errors} errors`);
}

backfill().catch(console.error);
