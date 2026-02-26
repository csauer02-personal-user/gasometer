# Gasometer

Cost intelligence dashboard for [Gas Town](https://github.com/steveyegge/gastown) — real-time visualization of multi-agent execution costs.

## Features

- **Live cost ingestion** from Claude Code agent sessions via stop-hook
- **6 D3.js custom visualizations**: Cost River, Burn Gauge, Heat Calendar, Flame Timeline, Role Treemap, Cost per Bead
- **Real-time updates** via WebSocket
- **Filterable** by date range, role, rig

## Architecture

- **Frontend**: Next.js 15 + D3.js on Vercel
- **Backend**: Express.js on Railway (ingest API + WebSocket)
- **Database**: Supabase (Postgres)

See [ARCHITECTURE.md](ARCHITECTURE.md) for full details.

## Setup

### Prerequisites
- Node.js 20+
- npm 10+
- Supabase project with `cost_events` table (see `supabase/migrations/`)

### Install

```bash
npm install
```

### Environment Variables

Create `backend/.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
GASOMETER_API_KEY=your-api-key
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws/live
```

### Development

```bash
# Start backend (port 3001)
npm run dev:backend

# Start frontend (port 3000)
npm run dev:frontend
```

### Backfill existing data

```bash
cd backend && npx tsx scripts/backfill.ts
```

### Testing

```bash
npm run test:backend    # Vitest unit tests
npm run test:e2e        # Playwright E2E tests
npm run lint            # ESLint
npm run typecheck       # TypeScript check
```

## Data Pipeline

```
Claude Code session ends
  → gt stop-hook records to ~/.gt/costs.jsonl
  → POST /api/ingest → Supabase cost_events table
  → WebSocket broadcast → live dashboard update
```

## License

Private — Gas Town internal tooling.
