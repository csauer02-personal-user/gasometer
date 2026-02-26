import useSWR from "swr";
import { fetchApi } from "@/lib/api";

interface Summary {
  today: { total_usd: number; sessions: number };
  week: { total_usd: number; sessions: number };
  month: { total_usd: number; sessions: number };
}

export function useSummary() {
  return useSWR<Summary>("/api/stats/summary", fetchApi, {
    refreshInterval: 30_000,
  });
}

interface DailyEntry {
  date: string;
  role: string;
  total_usd: number;
  session_count: number;
}

export function useDailyStats(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? `?${params.toString()}` : "";

  return useSWR<{ data: DailyEntry[] }>(`/api/stats/daily${query}`, fetchApi, {
    refreshInterval: 60_000,
  });
}
