import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export const statsRouter = Router();

// Helper: fetch all rows (paginated past Supabase's 1000-row default)
async function fetchAll(query: any): Promise<any[]> {
  const PAGE = 1000;
  let all: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await query.range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

// GET /api/stats/summary — today, this week, this month totals
statsRouter.get("/summary", async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayData, weekData, monthData] = await Promise.all([
    fetchAll(supabase.from("cost_events").select("cost_usd").gte("ended_at", todayStart)),
    fetchAll(supabase.from("cost_events").select("cost_usd").gte("ended_at", weekStart)),
    fetchAll(supabase.from("cost_events").select("cost_usd").gte("ended_at", monthStart)),
  ]);

  const sum = (rows: { cost_usd: number }[]) =>
    rows.reduce((acc, r) => acc + Number(r.cost_usd), 0);

  res.json({
    today: { total_usd: sum(todayData), sessions: todayData.length },
    week: { total_usd: sum(weekData), sessions: weekData.length },
    month: { total_usd: sum(monthData), sessions: monthData.length },
  });
});

// GET /api/stats/daily — daily aggregates for charting
statsRouter.get("/daily", async (req: Request, res: Response) => {
  const { from, to } = req.query;

  let query = supabase
    .from("cost_events")
    .select("cost_usd, role, rig, ended_at")
    .order("ended_at", { ascending: true });

  if (from) query = query.gte("ended_at", String(from));
  if (to) query = query.lte("ended_at", String(to));

  try {
    const data = await fetchAll(query);

    // Aggregate by date + role
    const daily = new Map<string, { date: string; role: string; total_usd: number; session_count: number }>();

    for (const row of data) {
      const date = new Date(row.ended_at).toISOString().split("T")[0];
      const key = `${date}:${row.role}`;
      const existing = daily.get(key);
      if (existing) {
        existing.total_usd += Number(row.cost_usd);
        existing.session_count += 1;
      } else {
        daily.set(key, { date, role: row.role, total_usd: Number(row.cost_usd), session_count: 1 });
      }
    }

    res.json({ data: Array.from(daily.values()) });
  } catch (error) {
    res.status(500).json({ error: "Query failed" });
  }
});

// GET /api/stats/roles — cost breakdown by role
statsRouter.get("/roles", async (req: Request, res: Response) => {
  const { from, to } = req.query;

  let query = supabase.from("cost_events").select("cost_usd, role");
  if (from) query = query.gte("ended_at", String(from));
  if (to) query = query.lte("ended_at", String(to));

  try {
    const data = await fetchAll(query);

    const roles = new Map<string, { role: string; total_usd: number; session_count: number }>();
    for (const row of data) {
      const existing = roles.get(row.role);
      if (existing) {
        existing.total_usd += Number(row.cost_usd);
        existing.session_count += 1;
      } else {
        roles.set(row.role, { role: row.role, total_usd: Number(row.cost_usd), session_count: 1 });
      }
    }

    res.json({ data: Array.from(roles.values()) });
  } catch (error) {
    res.status(500).json({ error: "Query failed" });
  }
});

// GET /api/stats/rigs — cost breakdown by rig
statsRouter.get("/rigs", async (req: Request, res: Response) => {
  const { from, to } = req.query;

  let query = supabase.from("cost_events").select("cost_usd, rig");
  if (from) query = query.gte("ended_at", String(from));
  if (to) query = query.lte("ended_at", String(to));

  try {
    const data = await fetchAll(query);

    const rigs = new Map<string, { rig: string | null; total_usd: number; session_count: number }>();
    for (const row of data) {
      const key = row.rig ?? "(none)";
      const existing = rigs.get(key);
      if (existing) {
        existing.total_usd += Number(row.cost_usd);
        existing.session_count += 1;
      } else {
        rigs.set(key, { rig: row.rig, total_usd: Number(row.cost_usd), session_count: 1 });
      }
    }

    res.json({ data: Array.from(rigs.values()) });
  } catch (error) {
    res.status(500).json({ error: "Query failed" });
  }
});
