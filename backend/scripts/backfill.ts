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

// Known session_id prefix → rig mapping (derived from records that have explicit rig)
const PREFIX_TO_RIG: Record<string, string> = {
  ca: "careers",
  do: "doccompare",
  ga: "gasometer",
  ha: "happyhour",
  om: "officemonitor",
};

function parseRigFromSessionId(sessionId: string): string | null {
  const prefix = sessionId.split("-")[0];
  return PREFIX_TO_RIG[prefix] ?? null;
}

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
        rig: record.rig ?? parseRigFromSessionId(record.session_id),
        cost_usd: record.cost_usd,
        input_tokens: record.input_tokens ?? null,
        output_tokens: record.output_tokens ?? null,
        cache_read_tokens: record.cache_read_tokens ?? null,
        cache_create_tokens: record.cache_create_tokens ?? null,
        model: record.model ?? null,
        duration_sec: record.duration_sec ?? null,
        beads_closed: record.beads_closed ?? null,
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

    if ((i / BATCH_SIZE + 1) % 5 === 0) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, lines.length)}/${lines.length}`);
    }
  }

  console.log(`Backfill complete: ${inserted} inserted, ${errors} errors`);
}

backfill().catch(console.error);
