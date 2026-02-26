import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { ingestRouter } from "../src/routes/ingest.js";

// Mock supabase
const mockUpsert = vi.fn();
vi.mock("../src/lib/supabase.js", () => ({
  supabase: {
    from: () => ({
      upsert: mockUpsert,
    }),
  },
}));

// Mock websocket broadcast
const mockBroadcast = vi.fn();
vi.mock("../src/lib/websocket.js", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/ingest", ingestRouter);
  return app;
}

describe("stop-hook integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GASOMETER_API_KEY;
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("should accept a costs.jsonl entry with minimal fields", async () => {
    const app = createApp();
    const costEntry = {
      session_id: "hq-mayor",
      role: "mayor",
      worker: "mayor",
      cost_usd: 6.49,
      ended_at: "2026-02-26T18:21:35.10899-05:00",
    };

    const res = await request(app)
      .post("/api/ingest")
      .send(costEntry)
      .expect(201);

    expect(res.body.status).toBe("ingested");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "hq-mayor",
        role: "mayor",
        worker: "mayor",
        cost_usd: 6.49,
        ended_at: "2026-02-26T18:21:35.10899-05:00",
      }),
      { onConflict: "session_id,ended_at" }
    );
  });

  it("should accept a costs.jsonl entry with all optional fields", async () => {
    const app = createApp();
    const costEntry = {
      session_id: "ga-polecat-obsidian",
      role: "polecat",
      worker: "obsidian",
      rig: "gasometer",
      cost_usd: 2.35,
      input_tokens: 50000,
      output_tokens: 12000,
      cache_read_tokens: 8000,
      cache_create_tokens: 3000,
      model: "claude-opus-4-6",
      duration_sec: 300,
      beads_closed: 2,
      ended_at: "2026-02-26T20:00:00Z",
    };

    await request(app).post("/api/ingest").send(costEntry).expect(201);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "ga-polecat-obsidian",
        rig: "gasometer",
        input_tokens: 50000,
        output_tokens: 12000,
        model: "claude-opus-4-6",
      }),
      { onConflict: "session_id,ended_at" }
    );
  });

  it("should accept authenticated request matching stop-hook curl", async () => {
    process.env.GASOMETER_API_KEY = "gaso-test-key";
    const app = createApp();
    const costEntry = {
      session_id: "test-session",
      role: "polecat",
      cost_usd: 1.0,
      ended_at: "2026-02-26T10:00:00Z",
    };

    await request(app)
      .post("/api/ingest")
      .set("Authorization", "Bearer gaso-test-key")
      .set("Content-Type", "application/json")
      .send(costEntry)
      .expect(201);
  });

  it("should reject empty body (simulates missing costs.jsonl)", async () => {
    const app = createApp();

    await request(app)
      .post("/api/ingest")
      .set("Content-Type", "application/json")
      .send({})
      .expect(400);

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("should handle duplicate posts idempotently via upsert", async () => {
    const app = createApp();
    const costEntry = {
      session_id: "hq-mayor",
      role: "mayor",
      cost_usd: 6.49,
      ended_at: "2026-02-26T18:21:35Z",
    };

    await request(app).post("/api/ingest").send(costEntry).expect(201);
    await request(app).post("/api/ingest").send(costEntry).expect(201);

    // Both calls should succeed — upsert handles dedup
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it("should return 201 even when database is slow (hook relies on silent fail)", async () => {
    mockUpsert.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    );
    const app = createApp();
    const costEntry = {
      session_id: "slow-test",
      role: "polecat",
      cost_usd: 0.5,
      ended_at: "2026-02-26T10:00:00Z",
    };

    await request(app).post("/api/ingest").send(costEntry).expect(201);
  });
});
