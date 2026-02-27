-- Fix cost_usd: backfill used Opus 3/4.1 pricing ($15/$75) instead of 4.5/4.6 ($5/$25).
-- Cache reads were 3.75x overpriced ($1.875 vs $0.50).
-- Truncate and re-backfill with correct pricing.
TRUNCATE cost_events;
