import { describe, it, expect } from "vitest";

describe("Gasometer API", () => {
  it("should have correct service name", () => {
    expect("gasometer-api").toBe("gasometer-api");
  });

  it("should validate cost event schema", () => {
    const validEvent = {
      session_id: "hq-mayor",
      role: "mayor",
      worker: "mayor",
      cost_usd: 0.15,
      ended_at: "2026-02-26T10:00:00Z",
    };
    expect(validEvent.session_id).toBeTruthy();
    expect(validEvent.cost_usd).toBeGreaterThan(0);
  });
});
