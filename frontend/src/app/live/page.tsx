"use client";

import { useWebSocket } from "@/hooks/useWebSocket";
import { formatUsd } from "@/lib/format";
import { getRoleColor } from "@/lib/colors";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LivePage() {
  const { connected, events } = useWebSocket();

  const costEvents = events.filter((e) => e.type === "cost_event");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Live Feed</h1>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className={connected ? "text-green-400" : "text-red-400"}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {costEvents.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
          <p className="text-gray-500">
            {connected
              ? "Waiting for cost events..."
              : "Connecting to live feed..."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {costEvents.map((event, i) => {
            const d = event.data as Record<string, unknown> | undefined;
            if (!d) return null;
            const role = String(d.role ?? "unknown");
            const worker = String(d.worker ?? "—");
            const costUsd = Number(d.cost_usd ?? 0);
            const endedAt = String(d.ended_at ?? "");

            return (
              <div
                key={`${d.session_id}-${endedAt}-${i}`}
                className="bg-gray-900 rounded-lg p-4 border border-gray-800 flex items-center gap-4"
              >
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getRoleColor(role) }}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{role}</span>
                  {worker !== "—" && (
                    <span className="text-gray-400 ml-2">/ {worker}</span>
                  )}
                </div>
                <span className="text-amber-400 font-mono font-medium">
                  {formatUsd(costUsd)}
                </span>
                {endedAt && (
                  <span className="text-gray-500 text-sm font-mono">
                    {formatTime(endedAt)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
