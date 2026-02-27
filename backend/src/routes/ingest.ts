import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { broadcast } from "../lib/websocket.js";

export const ingestRouter = Router();

const CostEventSchema = z.object({
  session_id: z.string(),
  role: z.string(),
  worker: z.string().optional(),
  rig: z.string().optional(),
  cost_usd: z.number(),
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  cache_read_tokens: z.number().optional(),
  cache_create_tokens: z.number().optional(),
  model: z.string().optional(),
  duration_sec: z.number().optional(),
  beads_closed: z.number().optional(),
  ended_at: z.string(),
});

function authenticate(req: Request, res: Response): boolean {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!process.env.GASOMETER_API_KEY) return true; // no key configured = open
  if (token !== process.env.GASOMETER_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

ingestRouter.post("/", async (req: Request, res: Response) => {
  if (!authenticate(req, res)) return;

  const parsed = CostEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    return;
  }

  const event = parsed.data;

  const { error } = await supabase.from("cost_events").upsert(
    {
      session_id: event.session_id,
      role: event.role,
      worker: event.worker ?? null,
      rig: event.rig ?? null,
      cost_usd: event.cost_usd,
      input_tokens: event.input_tokens ?? null,
      output_tokens: event.output_tokens ?? null,
      cache_read_tokens: event.cache_read_tokens ?? null,
      cache_create_tokens: event.cache_create_tokens ?? null,
      model: event.model ?? null,
      duration_sec: event.duration_sec ?? null,
      beads_closed: event.beads_closed ?? null,
      ended_at: event.ended_at,
    },
    { onConflict: "session_id" }
  );

  if (error) {
    console.error("Supabase insert error:", error);
    res.status(500).json({ error: "Database error" });
    return;
  }

  // Broadcast to WebSocket clients
  broadcast({ type: "cost_event", data: event });

  res.status(201).json({ status: "ingested" });
});
