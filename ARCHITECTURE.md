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

```
┌─────────────────────────────────────────────────────────────┐
│                        cost_events                          │
├─────────────────────┬───────────────────────────────────────┤
│ id                  │ UUID (PK, auto-generated)             │
│ session_id          │ text NOT NULL                         │
│ role                │ text NOT NULL                         │
│ worker              │ text                                  │
│ rig                 │ text                                  │
│ cost_usd            │ numeric(10,6) NOT NULL                │
│ input_tokens        │ bigint                                │
│ output_tokens       │ bigint                                │
│ cache_read_tokens   │ bigint                                │
│ cache_create_tokens │ bigint                                │
│ model               │ text                                  │
│ duration_sec        │ integer                               │
│ beads_closed        │ integer                               │
│ ended_at            │ timestamptz NOT NULL                  │
│ ingested_at         │ timestamptz (default now())           │
├─────────────────────┴───────────────────────────────────────┤
│ UNIQUE(session_id)                                          │
│ INDEX(ended_at), INDEX(role), INDEX(rig)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      daily_summaries                        │
├─────────────────────┬───────────────────────────────────────┤
│ date                │ date NOT NULL                         │
│ role                │ text NOT NULL                         │
│ rig                 │ text NOT NULL (default '')            │
│ total_usd           │ numeric(10,6)                         │
│ session_count       │ integer                               │
│ total_input_tokens  │ bigint                                │
│ total_output_tokens │ bigint                                │
├─────────────────────┴───────────────────────────────────────┤
│ PRIMARY KEY(date, role, rig)                                │
└─────────────────────────────────────────────────────────────┘
```

### Key fields

- `session_id`: Agent session identifier (e.g., "hq-mayor", "do-chrome")
- `role`: Agent role — mayor, polecat, witness, refinery, deacon, crew
- `worker`: Agent name (furiosa, nux, csauer, etc.)
- `rig`: Project container (careers, doccompare, gasometer, etc.)
- Dedup: upsert on `(session_id, ended_at)` — re-ingesting the same session updates in place

## API Reference

### `POST /api/ingest` — Receive cost event

**Auth:** Bearer token (`Authorization: Bearer <GASOMETER_API_KEY>`). If `GASOMETER_API_KEY` env var is unset, auth is open.

**Request body** (validated with Zod):
```json
{
  "session_id": "hq-mayor",        // required
  "role": "mayor",                  // required
  "cost_usd": 0.15,                // required (number)
  "ended_at": "2026-02-26T10:00Z", // required (ISO 8601)
  "worker": "mayor",               // optional
  "rig": "gasometer",              // optional
  "input_tokens": 1000,            // optional
  "output_tokens": 500,            // optional
  "cache_read_tokens": 200,        // optional
  "cache_create_tokens": 100,      // optional
  "model": "claude-sonnet-4-5-20250514",  // optional
  "duration_sec": 120,             // optional
  "beads_closed": 3                // optional
}
```

**Responses:**
- `201` — `{"status": "ingested"}`
- `400` — `{"error": "Invalid payload", "details": [...]}`
- `401` — `{"error": "Unauthorized"}`
- `500` — `{"error": "Database error"}`

**Side effect:** Broadcasts `{"type": "cost_event", "data": {...}}` to all WebSocket clients.

### `GET /api/costs` — Query cost events

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `from` | ISO date | — | Filter events >= this timestamp |
| `to` | ISO date | — | Filter events <= this timestamp |
| `role` | string | — | Filter by role |
| `rig` | string | — | Filter by rig |
| `limit` | number | 100 | Max results |
| `offset` | number | 0 | Pagination offset |

**Response:** `{"data": [...], "count": <number>}`

### `GET /api/stats/summary` — Period totals

Returns today / last 7 days / this month aggregates.

**Response:**
```json
{
  "today": {"total_usd": 1.23, "sessions": 5},
  "week": {"total_usd": 15.67, "sessions": 42},
  "month": {"total_usd": 89.50, "sessions": 200}
}
```

### `GET /api/stats/daily` — Daily aggregates

**Query params:** `from`, `to` (ISO dates)

**Response:** `{"data": [{"date": "2026-02-26", "role": "mayor", "total_usd": 1.23, "session_count": 5}, ...]}`

### `GET /api/stats/roles` — Role breakdown

**Query params:** `from`, `to` (ISO dates)

**Response:** `{"data": [{"role": "mayor", "total_usd": 45.00, "session_count": 100}, ...]}`

### `GET /api/stats/rigs` — Rig breakdown

**Query params:** `from`, `to` (ISO dates)

**Response:** `{"data": [{"rig": "gasometer", "total_usd": 30.00, "session_count": 80}, ...]}`

### `WS /ws/live` — Real-time cost stream

WebSocket endpoint for live cost event streaming. The frontend `useWebSocket` hook connects automatically with 3-second reconnect on disconnect.

**Protocol:**

1. On connect, server sends: `{"type": "connected", "message": "Gasometer live feed"}`
2. On each `POST /api/ingest`, server broadcasts to all connected clients: `{"type": "cost_event", "data": {...}}`
3. The `data` payload matches the ingest request body (session_id, role, worker, cost_usd, ended_at, etc.)
4. Client-side buffer: last 100 events (FIFO, newest first)

**Frontend env:** `NEXT_PUBLIC_WS_URL` (default: `ws://localhost:3001/ws/live`, production: `wss://gasometer-api-production.up.railway.app/ws/live`)

### `GET /health` — Health check

**Response:** `{"status": "ok", "service": "gasometer-api"}`

## Services

| Service | Name | URL |
|---------|------|-----|
| GitHub | gasometer | github.com/csauer02-personal-user/gasometer |
| Supabase | gasometer-db | (project dashboard) |
| Railway | gasometer-api | (railway dashboard) |
| Vercel | gasometer-dashboard | (vercel dashboard) |

## Frontend Architecture

### Layout & Navigation

- `layout.tsx` — Root layout with dark theme (`bg-gray-950`), active-state navigation via `Nav` component
- `Nav` — Client component using `next/link` + `usePathname` for active link highlighting
- Responsive grid: KPI cards stack on mobile (1 col → 2 col → 4 col)

### Dashboard Page (`/`)

Client component that fetches live data:

- **KPI Cards**: 4 summary cards (Today, This Week, This Month, Sessions) powered by `useSummary()` hook
  - Auto-refresh every 30s via SWR
  - Loading skeleton animation while data loads
  - Subtitles show event counts
- **Date Range Picker**: Preset buttons (Today, 7d, 30d) + custom date range inputs
- **Filter Chips**: Toggle-able role and rig filters with color-coded active states
- **Filtered Summary**: Shows filtered totals when filters are active
- **D3 Visualization Grid**: 4 placeholder cards for future D3 charts (Bead 5)

### Live Page (`/live`)

Client component for real-time cost event streaming:

- **Connection Status**: Green/red indicator dot with "Connected"/"Disconnected" label
- **Event Feed**: Scrolling list of cost events, newest first (max 100)
- **Event Cards**: Each event shows role (color-coded dot), worker name, cost (USD), and timestamp
- **Auto-reconnect**: 3-second reconnect via `useWebSocket` hook
- **Empty State**: Shows "Waiting for cost events..." when connected with no events, or "Connecting..." when disconnected

### Components (`frontend/src/components/`)

| Component | Path | Purpose |
|-----------|------|---------|
| `Nav` | `ui/Nav.tsx` | Navigation bar with active link state |
| `KpiCard` | `ui/KpiCard.tsx` | Summary stat card with loading state |
| `DateRangePicker` | `ui/DateRangePicker.tsx` | Preset + custom date range selector |
| `FilterChips` | `ui/FilterChips.tsx` | Toggle-able filter chip group |
| `CostRiver` | `viz/CostRiver.tsx` | Stacked area chart (cost by role over time) |
| `BurnGauge` | `viz/BurnGauge.tsx` | Radial donut gauge with green/yellow/red burn zones |
| `HeatCalendar` | `viz/HeatCalendar.tsx` | GitHub-style 365-day spend intensity grid |
| `FlameTimeline` | `viz/FlameTimeline.tsx` | Horizontal session bars showing parallelism |
| `RoleTreemap` | `viz/RoleTreemap.tsx` | Nested treemap: role to rig cost breakdown |

### Data Hooks (`frontend/src/hooks/`)

| Hook | Endpoint | Refresh |
|------|----------|---------|
| `useSummary()` | `GET /api/stats/summary` | 30s |
| `useDailyStats(from?, to?)` | `GET /api/stats/daily` | 60s |
| `useRoleStats(from?, to?)` | `GET /api/stats/roles` | 60s |
| `useRigStats(from?, to?)` | `GET /api/stats/rigs` | 60s |
| `useCostEvents(from?, to?, role?, rig?)` | `GET /api/costs` | 60s |
| `useWebSocket()` | `WS /ws/live` | Real-time |

### D3 Visualization Catalog

All visualizations are in `frontend/src/components/viz/`, built with D3.js v7 as self-contained React components. Each uses `useRef` for SVG rendering, responsive sizing, and hover tooltips.

| Component | Type | Data Source | Key Features |
|-----------|------|-------------|--------------|
| `CostRiver` | Stacked area chart | `/api/stats/daily` | X: days, Y: cumulative USD, stacked by role. Smooth monotone curves, hover tooltips, role-colored layers |
| `BurnGauge` | Radial donut gauge | `/api/stats/summary` | Shows today's spend against green ($0-10) / yellow ($10-25) / red ($25+) zones. Animated arc transition, hourly rate + daily average labels |
| `HeatCalendar` | GitHub-style grid | `/api/stats/daily` | 365-day contribution calendar. YlOrRd color scale by daily spend intensity. Day/month labels, click-to-drill-down support |
| `FlameTimeline` | Horizontal bar chart | `/api/costs` | Session bars on time axis. Width = duration, color = role, opacity = cost. Greedy lane-packing algorithm shows parallel sessions |
| `RoleTreemap` | Nested treemap | `/api/stats/roles` + `/api/stats/rigs` | Role-to-rig hierarchy. Rectangle size = cost, color = role. Labels + value text with overflow truncation |

**Shared conventions:**
- Role colors from `lib/colors.ts` (`ROLE_COLORS` map + `getRoleColor()`)
- USD formatting from `lib/format.ts` (`formatUsd()`)
- Tooltip pattern: absolute-positioned div with opacity transition, positioned via `d3.pointer()`
- Responsive: reads container dimensions on render, no fixed sizes
- Each chart has a `data-testid` attribute for Playwright E2E testing
