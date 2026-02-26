# Gasometer Architecture

## Overview

Gasometer is the cost intelligence dashboard for Gas Town — a multi-agent workspace manager. It ingests per-session cost data from Claude Code agent sessions and provides real-time visualization and analytics.

## System Architecture

```
┌─────────────┐     POST /ingest      ┌──────────────┐     reads      ┌──────────────┐
│  gt stop-hook│ ──────────────────►   │ Railway API   │ ──────────►   │   Supabase   │
│  (each sess) │                       │ (Express.js)  │               │  (Postgres)  │
└─────────────┘                       └──────┬───────┘               └──────┬───────┘
                                              │ WebSocket                    │
                                              ▼                              │ direct query
                                      ┌──────────────┐                     │
                                      │ Vercel Next.js│ ◄──────────────────┘
                                      │  + D3 custom  │
                                      └──────────────┘
```

## Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | Next.js 15 + D3.js + TypeScript | Dashboard with custom visualizations |
| Backend API | Express.js + TypeScript (Railway) | Ingest endpoint, WebSocket, aggregation |
| Database | Supabase (Postgres) | Persistent storage, REST API |
| Testing | Vitest (backend) + Playwright (frontend) | Unit, integration, E2E |
| CI/CD | GitHub Actions | Lint + typecheck + test on PRs |

## Data Model

### `cost_events` — raw session cost records
- `id`: UUID primary key
- `session_id`: Agent session identifier (e.g., "hq-mayor", "careers-polecat-nux")
- `role`: Agent role (mayor, polecat, witness, refinery, deacon, crew)
- `worker`: Agent name (furiosa, nux, csauer, etc.)
- `rig`: Project container (careers, doccompare, gasometer, etc.)
- `cost_usd`: Session cost in USD
- `ended_at`: Session end timestamp
- `ingested_at`: When the record was stored
- Dedup: unique(session_id, ended_at)

### `daily_summaries` — pre-aggregated daily totals
- Keyed by (date, role, rig)
- Stores total_usd, session_count, token totals

## API Reference

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ingest` | Receive cost event (bearer token auth) |
| GET | `/api/costs` | Query cost events (filters: from, to, role, rig) |
| GET | `/api/stats/daily` | Daily aggregates by role |
| GET | `/api/stats/summary` | Today/week/month totals |
| GET | `/api/stats/roles` | Cost breakdown by role |
| GET | `/api/stats/rigs` | Cost breakdown by rig |
| WS | `/ws/live` | Real-time cost event stream |
| GET | `/health` | Health check |

## Services

| Service | Name | URL |
|---------|------|-----|
| GitHub | gasometer | github.com/csauer02-personal-user/gasometer |
| Supabase | gasometer-db | (project dashboard) |
| Railway | gasometer-api | (railway dashboard) |
| Vercel | gasometer-dashboard | (vercel dashboard) |

## Frontend Visualizations (planned)

1. **Cost River** — Stacked area chart (cost by role over time)
2. **Burn Rate Gauge** — Radial gauge with green/yellow/red zones
3. **Heat Calendar** — GitHub-style daily cost intensity grid
4. **Session Flame Timeline** — Overlapping session bars showing parallelism
5. **Role Treemap** — Nested rectangles (role → rig → worker)
6. **Cost per Bead** — Scatter plot (efficiency metric, future)
