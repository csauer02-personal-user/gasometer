-- Gasometer: Cost events table for tracking Gas Town agent session costs
create table if not exists cost_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  role text not null,
  worker text,
  rig text,
  cost_usd numeric(10,6) not null,
  input_tokens bigint,
  output_tokens bigint,
  cache_read_tokens bigint,
  cache_create_tokens bigint,
  model text,
  duration_sec integer,
  beads_closed integer,
  ended_at timestamptz not null,
  ingested_at timestamptz default now(),
  unique(session_id, ended_at)
);

create index if not exists idx_cost_events_ended on cost_events(ended_at);
create index if not exists idx_cost_events_role on cost_events(role);
create index if not exists idx_cost_events_rig on cost_events(rig);

-- Daily summaries for pre-aggregated charting queries
create table if not exists daily_summaries (
  date date not null,
  role text not null,
  rig text,
  total_usd numeric(10,6),
  session_count integer,
  total_input_tokens bigint,
  total_output_tokens bigint,
  primary key (date, role, coalesce(rig, ''))
);
