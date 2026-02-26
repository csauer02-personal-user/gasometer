import express from "express";
import cors from "cors";
import { createServer } from "http";
import { ingestRouter } from "./routes/ingest.js";
import { costsRouter } from "./routes/costs.js";
import { statsRouter } from "./routes/stats.js";
import { setupWebSocket } from "./lib/websocket.js";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "gasometer-api" });
});

// API routes
app.use("/api/ingest", ingestRouter);
app.use("/api/costs", costsRouter);
app.use("/api/stats", statsRouter);

// WebSocket for live updates
setupWebSocket(server);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Gasometer API listening on port ${PORT}`);
});

export { app, server };
