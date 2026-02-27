import { test, expect } from "@playwright/test";

test("live page shows connection status indicator", async ({ page }) => {
  await page.goto("/live");
  await expect(page.locator("h1")).toHaveText("Live Feed");
  // Should show connected or disconnected status
  await expect(
    page.getByText("Connected").or(page.getByText("Disconnected"))
  ).toBeVisible();
});

test("live page shows waiting message when no events", async ({ page }) => {
  await page.goto("/live");
  await expect(
    page
      .getByText("Waiting for cost events...")
      .or(page.getByText("Connecting to live feed..."))
  ).toBeVisible();
});

test("live page renders cost event from WebSocket", async ({ page }) => {
  // Mock the WebSocket to inject a test event
  await page.addInitScript(() => {
    const OrigWS = window.WebSocket;
    class MockWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      CONNECTING = 0;
      OPEN = 1;
      CLOSING = 2;
      CLOSED = 3;
      readyState = 1;
      url: string;
      onopen: ((ev: Event) => void) | null = null;
      onclose: ((ev: Event) => void) | null = null;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;

      constructor(url: string) {
        super();
        this.url = url;

        setTimeout(() => {
          this.onopen?.(new Event("open"));

          // Send connected message
          const connMsg = new MessageEvent("message", {
            data: JSON.stringify({
              type: "connected",
              message: "Gasometer live feed",
            }),
          });
          this.onmessage?.(connMsg);

          // Send a mock cost event
          setTimeout(() => {
            const costMsg = new MessageEvent("message", {
              data: JSON.stringify({
                type: "cost_event",
                data: {
                  session_id: "test-session",
                  role: "polecat",
                  worker: "obsidian",
                  cost_usd: 0.42,
                  ended_at: "2026-02-26T15:30:00Z",
                },
              }),
            });
            this.onmessage?.(costMsg);
          }, 100);
        }, 50);
      }

      send() {}
      close() {
        this.readyState = 3;
      }
    }

    // @ts-expect-error replacing WebSocket for test
    window.WebSocket = MockWebSocket;
  });

  await page.goto("/live");

  // Should show connected status
  await expect(page.getByText("Connected")).toBeVisible();

  // Should show the cost event
  await expect(page.getByText("polecat")).toBeVisible();
  await expect(page.getByText("/ obsidian")).toBeVisible();
  await expect(page.getByText("$0.42")).toBeVisible();
});
