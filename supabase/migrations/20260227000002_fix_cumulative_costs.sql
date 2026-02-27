-- Fix cumulative cost handling.
-- costs.jsonl stores cumulative running totals per session_id.
-- Session IDs are reused across conversation restarts (cost resets to 0).
-- We need to detect resets and store one row per logical session segment.

-- Wipe data (will re-backfill correctly)
TRUNCATE cost_events;

-- Drop the session_id-only constraint (too restrictive for multiple segments)
ALTER TABLE cost_events DROP CONSTRAINT IF EXISTS cost_events_session_id_key;

-- Add base_session_id column to track the original session name
ALTER TABLE cost_events ADD COLUMN IF NOT EXISTS base_session_id text;

-- Unique on session_id (which will be composite: base:date:seq for segments)
ALTER TABLE cost_events ADD CONSTRAINT cost_events_session_id_key UNIQUE (session_id);

-- Index on base_session_id for fast lookup of latest segment
CREATE INDEX IF NOT EXISTS idx_cost_events_base_session ON cost_events(base_session_id);
