# Gasometer — Agent Instructions

## What is this?
Cost intelligence dashboard for Gas Town. Monorepo with `frontend/` (Next.js + D3) and `backend/` (Express + TypeScript).

## Quick Start

```bash
# Install dependencies
npm install

# Backend dev
npm run dev:backend    # Express on :3001

# Frontend dev
npm run dev:frontend   # Next.js on :3000

# Run tests
npm run test:backend   # Vitest
npm run test:e2e       # Playwright (starts dev server)
```

## Required Environment Variables

### Backend (.env in backend/)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
GASOMETER_API_KEY=your-api-key
PORT=3001
```

### Frontend (.env.local in frontend/)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws/live
```

## Operational Rules (MUST FOLLOW)

1. **Feature branches only** — never push directly to main. Create a branch, push, run `gt done`.
2. **Run tests before completing** — `npm run test:backend` and `npm run lint` must pass.
3. **Update docs** — if you change the API or data model, update ARCHITECTURE.md.
4. **Apply migrations** — if adding SQL migrations, they must be applied to Supabase as part of your work.

## Project Structure

```
frontend/         → Next.js 15, deploys to Vercel
  src/app/        → Pages (dashboard, sessions, live)
  src/components/ → React components (viz/ for D3, ui/ for shared)
  src/hooks/      → Data fetching hooks (SWR + WebSocket)
  src/lib/        → API client, color palette, formatters
  e2e/            → Playwright E2E tests

backend/          → Express.js, deploys to Railway
  src/routes/     → API route handlers (ingest, costs, stats)
  src/lib/        → Supabase client, WebSocket broadcaster
  __tests__/      → Vitest tests
  scripts/        → Backfill and maintenance scripts

supabase/
  migrations/     → SQL migration files
```

## Testing

- **Backend**: Vitest — `npm run test -w backend`
- **Frontend E2E**: Playwright — `npm run test:e2e -w frontend`
- **Linting**: ESLint flat config — `npm run lint`
- **Type checking**: `npm run typecheck`

## Key Patterns

- Cost events are deduplicated by (session_id, ended_at) on upsert
- WebSocket broadcasts to all connected clients on each ingest
- D3 visualizations are in `frontend/src/components/viz/` — each is a self-contained component
- SWR auto-refreshes summary data every 30s
