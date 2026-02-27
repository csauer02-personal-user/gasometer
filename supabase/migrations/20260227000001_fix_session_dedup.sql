-- Fix: costs.jsonl contains cumulative running totals per session.
-- The old constraint (session_id, ended_at) stored every intermediate value.
-- Change to unique(session_id) so upsert keeps only the latest cost per session.

-- Wipe bad data (all 766 duplicate cumulative records)
TRUNCATE cost_events;

-- Drop old constraint
ALTER TABLE cost_events DROP CONSTRAINT IF EXISTS cost_events_session_id_ended_at_key;

-- Add new constraint: one row per session
ALTER TABLE cost_events ADD CONSTRAINT cost_events_session_id_key UNIQUE (session_id);
