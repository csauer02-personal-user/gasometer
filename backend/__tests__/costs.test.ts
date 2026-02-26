import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { costsRouter } from "../src/routes/costs.js";

// Build a chainable query mock
function createQueryMock(data: unknown[] | null = [], error: unknown = null) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (val: unknown) => void) => resolve({ data, error })),
  };
  // Make the mock thenable so await works
  Object.defineProperty(mock, "then", {
    value: (resolve: (val: unknown) => void) => Promise.resolve({ data, error }).then(resolve),
    enumerable: false,
  });
  return mock;
}

let queryMock: ReturnType<typeof createQueryMock>;

vi.mock("../src/lib/supabase.js", () => ({
  supabase: {
    from: () => {
      return queryMock;
    },
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/costs", costsRouter);
  return app;
}

describe("GET /api/costs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return cost events with default pagination", async () => {
    const mockData = [
      { id: "1", session_id: "hq-mayor", role: "mayor", cost_usd: 0.15, ended_at: "2026-02-26T10:00:00Z" },
      { id: "2", session_id: "do-chrome", role: "polecat", cost_usd: 1.2, ended_at: "2026-02-26T09:00:00Z" },
    ];
    queryMock = createQueryMock(mockData);
    const app = createApp();

    const res = await request(app).get("/api/costs").expect(200);

    expect(res.body.data).toEqual(mockData);
    expect(res.body.count).toBe(2);
    expect(queryMock.select).toHaveBeenCalledWith("*");
    expect(queryMock.order).toHaveBeenCalledWith("ended_at", { ascending: false });
  });

  it("should apply date range filters", async () => {
    queryMock = createQueryMock([]);
    const app = createApp();

    await request(app)
      .get("/api/costs?from=2026-02-01&to=2026-02-28")
      .expect(200);

    expect(queryMock.gte).toHaveBeenCalledWith("ended_at", "2026-02-01");
    expect(queryMock.lte).toHaveBeenCalledWith("ended_at", "2026-02-28");
  });

  it("should apply role filter", async () => {
    queryMock = createQueryMock([]);
    const app = createApp();

    await request(app).get("/api/costs?role=polecat").expect(200);

    expect(queryMock.eq).toHaveBeenCalledWith("role", "polecat");
  });

  it("should apply rig filter", async () => {
    queryMock = createQueryMock([]);
    const app = createApp();

    await request(app).get("/api/costs?rig=gasometer").expect(200);

    expect(queryMock.eq).toHaveBeenCalledWith("rig", "gasometer");
  });

  it("should apply custom limit and offset", async () => {
    queryMock = createQueryMock([]);
    const app = createApp();

    await request(app).get("/api/costs?limit=50&offset=10").expect(200);

    expect(queryMock.limit).toHaveBeenCalledWith(50);
    expect(queryMock.range).toHaveBeenCalledWith(10, 59);
  });

  it("should return 500 on database error", async () => {
    queryMock = createQueryMock(null, { message: "connection refused" });
    const app = createApp();

    const res = await request(app).get("/api/costs").expect(500);

    expect(res.body.error).toBe("Query failed");
    expect(res.body.details).toBe("connection refused");
  });

  it("should return empty array when no data", async () => {
    queryMock = createQueryMock([]);
    const app = createApp();

    const res = await request(app).get("/api/costs").expect(200);

    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });
});
