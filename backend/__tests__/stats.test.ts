import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { statsRouter } from "../src/routes/stats.js";

// Configurable mock per test
let mockResults: Record<string, { data: unknown[] | null; error: unknown }> = {};
let callIndex = 0;

function createChainMock() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  Object.defineProperty(chain, "then", {
    value: (resolve: (val: unknown) => void) => {
      const keys = Object.keys(mockResults);
      const key = keys[callIndex % keys.length];
      callIndex++;
      return Promise.resolve(mockResults[key]).then(resolve);
    },
    enumerable: false,
  });
  return chain;
}

vi.mock("../src/lib/supabase.js", () => ({
  supabase: {
    from: () => createChainMock(),
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/stats", statsRouter);
  return app;
}

describe("GET /api/stats/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callIndex = 0;
  });

  it("should return today/week/month summaries", async () => {
    // summary makes 3 parallel queries: today, week, month
    mockResults = {
      today: { data: [{ cost_usd: 0.5 }, { cost_usd: 0.3 }], error: null },
      week: { data: [{ cost_usd: 0.5 }, { cost_usd: 0.3 }, { cost_usd: 1.0 }], error: null },
      month: { data: [{ cost_usd: 0.5 }, { cost_usd: 0.3 }, { cost_usd: 1.0 }, { cost_usd: 2.0 }], error: null },
    };
    const app = createApp();

    const res = await request(app).get("/api/stats/summary").expect(200);

    expect(res.body).toHaveProperty("today");
    expect(res.body).toHaveProperty("week");
    expect(res.body).toHaveProperty("month");
    expect(res.body.today).toHaveProperty("total_usd");
    expect(res.body.today).toHaveProperty("sessions");
  });

  it("should return zeros when no data", async () => {
    mockResults = {
      today: { data: [], error: null },
      week: { data: [], error: null },
      month: { data: [], error: null },
    };
    const app = createApp();

    const res = await request(app).get("/api/stats/summary").expect(200);

    expect(res.body.today.total_usd).toBe(0);
    expect(res.body.today.sessions).toBe(0);
  });
});

describe("GET /api/stats/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callIndex = 0;
  });

  it("should aggregate costs by date and role", async () => {
    mockResults = {
      data: {
        data: [
          { cost_usd: 0.5, role: "mayor", rig: null, ended_at: "2026-02-26T10:00:00Z" },
          { cost_usd: 0.3, role: "mayor", rig: null, ended_at: "2026-02-26T14:00:00Z" },
          { cost_usd: 1.0, role: "polecat", rig: "gasometer", ended_at: "2026-02-26T12:00:00Z" },
          { cost_usd: 0.7, role: "mayor", rig: null, ended_at: "2026-02-25T10:00:00Z" },
        ],
        error: null,
      },
    };
    const app = createApp();

    const res = await request(app).get("/api/stats/daily").expect(200);

    const data = res.body.data;
    expect(data).toBeInstanceOf(Array);

    // Should have 3 entries: 2026-02-26:mayor, 2026-02-26:polecat, 2026-02-25:mayor
    expect(data).toHaveLength(3);

    const feb26Mayor = data.find((d: { date: string; role: string }) => d.date === "2026-02-26" && d.role === "mayor");
    expect(feb26Mayor).toBeDefined();
    expect(feb26Mayor.total_usd).toBeCloseTo(0.8);
    expect(feb26Mayor.session_count).toBe(2);
  });

  it("should apply date range filters", async () => {
    mockResults = { data: { data: [], error: null } };
    const app = createApp();

    await request(app).get("/api/stats/daily?from=2026-02-01&to=2026-02-28").expect(200);
  });

  it("should return 500 on error", async () => {
    mockResults = { data: { data: null, error: { message: "fail" } } };
    const app = createApp();

    await request(app).get("/api/stats/daily").expect(500);
  });
});

describe("GET /api/stats/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callIndex = 0;
  });

  it("should aggregate costs by role", async () => {
    mockResults = {
      data: {
        data: [
          { cost_usd: 0.5, role: "mayor" },
          { cost_usd: 0.3, role: "mayor" },
          { cost_usd: 1.0, role: "polecat" },
          { cost_usd: 0.7, role: "witness" },
        ],
        error: null,
      },
    };
    const app = createApp();

    const res = await request(app).get("/api/stats/roles").expect(200);

    const data = res.body.data;
    expect(data).toHaveLength(3);

    const mayor = data.find((d: { role: string }) => d.role === "mayor");
    expect(mayor.total_usd).toBeCloseTo(0.8);
    expect(mayor.session_count).toBe(2);
  });

  it("should return 500 on error", async () => {
    mockResults = { data: { data: null, error: { message: "fail" } } };
    const app = createApp();

    await request(app).get("/api/stats/roles").expect(500);
  });
});

describe("GET /api/stats/rigs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callIndex = 0;
  });

  it("should aggregate costs by rig", async () => {
    mockResults = {
      data: {
        data: [
          { cost_usd: 0.5, rig: "gasometer" },
          { cost_usd: 0.3, rig: "gasometer" },
          { cost_usd: 1.0, rig: "careers" },
          { cost_usd: 0.7, rig: null },
        ],
        error: null,
      },
    };
    const app = createApp();

    const res = await request(app).get("/api/stats/rigs").expect(200);

    const data = res.body.data;
    expect(data).toHaveLength(3);

    const gasometer = data.find((d: { rig: string }) => d.rig === "gasometer");
    expect(gasometer.total_usd).toBeCloseTo(0.8);
    expect(gasometer.session_count).toBe(2);

    const noRig = data.find((d: { rig: string | null }) => d.rig === null);
    expect(noRig).toBeDefined();
  });

  it("should return 500 on error", async () => {
    mockResults = { data: { data: null, error: { message: "fail" } } };
    const app = createApp();

    await request(app).get("/api/stats/rigs").expect(500);
  });
});
