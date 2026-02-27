-- Truncate old costs.jsonl-derived data to replace with transcript-based data.
-- Transcript data is the authoritative source: each transcript file = one session
-- with accurate per-message token counts.
TRUNCATE cost_events;
