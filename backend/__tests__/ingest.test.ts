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

describe("POST /api/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GASOMETER_API_KEY;
  });

  const validEvent = {
    session_id: "hq-mayor",
    role: "mayor",
    worker: "mayor",
    cost_usd: 0.15,
    ended_at: "2026-02-26T10:00:00Z",
  };

  it("should ingest a valid cost event", async () => {
    mockUpsert.mockResolvedValue({ error: null });
    const app = createApp();

    const res = await request(app)
      .post("/api/ingest")
      .send(validEvent)
      .expect(201);

    expect(res.body.status).toBe("ingested");
    expect(mockUpsert).toHaveBeenCalledOnce();
  });

  it("should broadcast event to WebSocket after ingest", async () => {
    mockUpsert.mockResolvedValue({ error: null });
    const app = createApp();

    await request(app).post("/api/ingest").send(validEvent).expect(201);

    expect(mockBroadcast).toHaveBeenCalledWith({
      type: "cost_event",
      data: validEvent,
    });
  });

  it("should reject invalid payload (missing session_id)", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/api/ingest")
      .send({ role: "mayor", cost_usd: 0.1 })
      .expect(400);

    expect(res.body.error).toBe("Invalid payload");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("should reject invalid payload (missing ended_at)", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/api/ingest")
      .send({ session_id: "x", role: "mayor", cost_usd: 0.1 })
      .expect(400);

    expect(res.body.error).toBe("Invalid payload");
  });

  it("should reject invalid payload (cost_usd not a number)", async () => {
    const app = createApp();

    await request(app)
      .post("/api/ingest")
      .send({ ...validEvent, cost_usd: "not-a-number" })
      .expect(400);
  });

  it("should return 401 when API key is set and token is missing", async () => {
    process.env.GASOMETER_API_KEY = "secret-key";
    const app = createApp();

    await request(app).post("/api/ingest").send(validEvent).expect(401);

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("should return 401 when API key is set and token is wrong", async () => {
    process.env.GASOMETER_API_KEY = "secret-key";
    const app = createApp();

    await request(app)
      .post("/api/ingest")
      .set("Authorization", "Bearer wrong-key")
      .send(validEvent)
      .expect(401);
  });

  it("should accept request when API key matches", async () => {
    process.env.GASOMETER_API_KEY = "secret-key";
    mockUpsert.mockResolvedValue({ error: null });
    const app = createApp();

    await request(app)
      .post("/api/ingest")
      .set("Authorization", "Bearer secret-key")
      .send(validEvent)
      .expect(201);

    expect(mockUpsert).toHaveBeenCalledOnce();
  });

  it("should allow requests when GASOMETER_API_KEY is not set", async () => {
    mockUpsert.mockResolvedValue({ error: null });
    const app = createApp();

    await request(app).post("/api/ingest").send(validEvent).expect(201);
  });

  it("should return 500 on database error", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "db down" } });
    const app = createApp();

    const res = await request(app)
      .post("/api/ingest")
      .send(validEvent)
      .expect(500);

    expect(res.body.error).toBe("Database error");
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it("should upsert with correct conflict resolution", async () => {
    mockUpsert.mockResolvedValue({ error: null });
    const app = createApp();

    await request(app).post("/api/ingest").send(validEvent).expect(201);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: validEvent.session_id,
        ended_at: validEvent.ended_at,
      }),
      { onConflict: "session_id,ended_at" }
    );
  });

  it("should pass optional fields as null when not provided", async () => {
    mockUpsert.mockResolvedValue({ error: null });
    const app = createApp();

    const minimalEvent = {
      session_id: "test",
      role: "polecat",
      cost_usd: 0.5,
      ended_at: "2026-02-26T10:00:00Z",
    };

    await request(app).post("/api/ingest").send(minimalEvent).expect(201);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        worker: null,
        rig: null,
        input_tokens: null,
        model: null,
      }),
      expect.any(Object)
    );
  });

  it("should include all optional fields when provided", async () => {
    mockUpsert.mockResolvedValue({ error: null });
    const app = createApp();

    const fullEvent = {
      ...validEvent,
      rig: "gasometer",
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_tokens: 200,
      cache_create_tokens: 100,
      model: "claude-sonnet-4-5-20250514",
      duration_sec: 120,
      beads_closed: 3,
    };

    await request(app).post("/api/ingest").send(fullEvent).expect(201);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rig: "gasometer",
        input_tokens: 1000,
        output_tokens: 500,
        model: "claude-sonnet-4-5-20250514",
      }),
      expect.any(Object)
    );
  });
});
