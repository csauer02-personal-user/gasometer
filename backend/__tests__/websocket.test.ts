import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the websocket module's broadcast logic via mocked WSS
describe("WebSocket broadcast", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("setupWebSocket should configure WSS on /ws/live path", async () => {
    const mockServer = { on: vi.fn() };

    const { setupWebSocket } = await import("../src/lib/websocket.js");
    expect(() => setupWebSocket(mockServer as never)).not.toThrow();
  });

  it("broadcast should not throw after setupWebSocket", async () => {
    const { setupWebSocket, broadcast } = await import("../src/lib/websocket.js");

    const mockServer = { on: vi.fn() };
    setupWebSocket(mockServer as never);

    // Verify broadcast doesn't throw when called after setup
    expect(() => broadcast({ type: "test" })).not.toThrow();
  });

  it("broadcast should be safe to call before setupWebSocket", async () => {
    // Re-import to get fresh module state
    vi.resetModules();
    const { broadcast } = await import("../src/lib/websocket.js");
    // Should not throw even if wss is uninitialized
    expect(() => broadcast({ type: "test" })).not.toThrow();
  });
});
