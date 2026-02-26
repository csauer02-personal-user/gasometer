import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer;

export function setupWebSocket(server: HttpServer): void {
  wss = new WebSocketServer({ server, path: "/ws/live" });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected", message: "Gasometer live feed" }));
  });
}

export function broadcast(data: unknown): void {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
