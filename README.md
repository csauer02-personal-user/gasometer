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

## Stop-Hook Setup

The gasometer dashboard receives cost data via a Claude Code stop-hook that fires after each agent response.

### 1. Set environment variables

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export GASOMETER_API_URL=https://gasometer-api-production.up.railway.app
export GASOMETER_KEY=<your-api-key>
```

### 2. Add the stop-hook to Claude Code settings

The hook is configured in `~/.claude/settings.json` under `hooks.Stop`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "command": "[ -f ~/.gt/costs.jsonl ] && curl -s --max-time 5 -X POST \"${GASOMETER_API_URL}/api/ingest\" -H \"Authorization: Bearer ${GASOMETER_KEY}\" -H \"Content-Type: application/json\" -d \"$(tail -1 ~/.gt/costs.jsonl)\" >/dev/null 2>&1; true",
            "type": "command"
          }
        ],
        "matcher": ""
      }
    ]
  }
}
```

**Error handling:** The hook fails silently — `--max-time 5` prevents hanging, `>/dev/null 2>&1` suppresses output, and `; true` ensures the hook never blocks session end.

### 3. Verify

After a Claude Code session, check the dashboard or query the API:

```bash
curl -s "${GASOMETER_API_URL}/api/costs/summary" -H "Authorization: Bearer ${GASOMETER_KEY}" | jq .
```

## Data Pipeline

```
Claude Code session ends
  → gt stop-hook records to ~/.gt/costs.jsonl
  → Stop hook: POST /api/ingest → Supabase cost_events table
  → WebSocket broadcast → live dashboard update
```

## License

Private — Gas Town internal tooling.
