import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export const costsRouter = Router();

costsRouter.get("/", async (req: Request, res: Response) => {
  const { from, to, role, rig, limit = "100", offset = "0" } = req.query;

  let query = supabase
    .from("cost_events")
    .select("*")
    .order("ended_at", { ascending: false })
    .limit(Number(limit))
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (from) query = query.gte("ended_at", String(from));
  if (to) query = query.lte("ended_at", String(to));
  if (role) query = query.eq("role", String(role));
  if (rig) query = query.eq("rig", String(rig));

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: "Query failed", details: error.message });
    return;
  }

  res.json({ data, count: data?.length ?? 0 });
});
