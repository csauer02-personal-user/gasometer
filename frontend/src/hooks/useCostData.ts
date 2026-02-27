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

interface RoleEntry {
  role: string;
  total_usd: number;
  session_count: number;
}

export function useRoleStats(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? `?${params.toString()}` : "";

  return useSWR<{ data: RoleEntry[] }>(`/api/stats/roles${query}`, fetchApi, {
    refreshInterval: 60_000,
  });
}

interface RigEntry {
  rig: string | null;
  total_usd: number;
  session_count: number;
}

export function useRigStats(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? `?${params.toString()}` : "";

  return useSWR<{ data: RigEntry[] }>(`/api/stats/rigs${query}`, fetchApi, {
    refreshInterval: 60_000,
  });
}

export interface CostEvent {
  id: string;
  session_id: string;
  role: string;
  worker: string | null;
  rig: string | null;
  cost_usd: number;
  duration_sec: number | null;
  ended_at: string;
}

export function useCostEvents(from?: string, to?: string, role?: string, rig?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (role) params.set("role", role);
  if (rig) params.set("rig", rig);
  params.set("limit", "500");
  const query = `?${params.toString()}`;

  return useSWR<{ data: CostEvent[] }>(`/api/costs${query}`, fetchApi, {
    refreshInterval: 60_000,
  });
}
