"use client";

import { useState, useMemo } from "react";
import { useSummary, useDailyStats } from "@/hooks/useCostData";
import { formatUsd } from "@/lib/format";
import { KpiCard } from "@/components/ui/KpiCard";
import { FilterChips } from "@/components/ui/FilterChips";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { ROLE_COLORS } from "@/lib/colors";

type Preset = "today" | "7d" | "30d" | "custom";

function getDateRange(preset: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  const toDate = now.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: toDate, to: toDate };
    case "7d": {
      const d = new Date(now.getTime() - 7 * 86400000);
      return { from: d.toISOString().split("T")[0], to: toDate };
    }
    case "30d": {
      const d = new Date(now.getTime() - 30 * 86400000);
      return { from: d.toISOString().split("T")[0], to: toDate };
    }
    case "custom":
      return { from: customFrom || toDate, to: customTo || toDate };
  }
}

const KNOWN_ROLES = Object.keys(ROLE_COLORS);
const KNOWN_RIGS = ["gasometer", "gastown", "beads", "longeye"];

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useSummary();

  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedRigs, setSelectedRigs] = useState<string[]>([]);

  const range = getDateRange(preset, customFrom, customTo);
  const { data: dailyData } = useDailyStats(range.from, range.to);

  const filteredDaily = useMemo(() => {
    if (!dailyData?.data) return [];
    return dailyData.data.filter((entry) => {
      if (selectedRoles.length > 0 && !selectedRoles.includes(entry.role)) return false;
      return true;
    });
  }, [dailyData, selectedRoles]);

  const filteredTotals = useMemo(() => {
    const total = filteredDaily.reduce((sum, e) => sum + e.total_usd, 0);
    const sessions = filteredDaily.reduce((sum, e) => sum + e.session_count, 0);
    return { total, sessions };
  }, [filteredDaily]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Cost Dashboard</h1>
        <DateRangePicker
          preset={preset}
          from={customFrom}
          to={customTo}
          onPresetChange={setPreset}
          onFromChange={setCustomFrom}
          onToChange={setCustomTo}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Today"
          value={summary ? formatUsd(summary.today.total_usd) : "$0.00"}
          loading={summaryLoading}
          subtitle={summary ? `${summary.today.sessions} events` : undefined}
        />
        <KpiCard
          label="This Week"
          value={summary ? formatUsd(summary.week.total_usd) : "$0.00"}
          loading={summaryLoading}
          subtitle={summary ? `${summary.week.sessions} events` : undefined}
        />
        <KpiCard
          label="This Month"
          value={summary ? formatUsd(summary.month.total_usd) : "$0.00"}
          loading={summaryLoading}
          subtitle={summary ? `${summary.month.sessions} events` : undefined}
        />
        <KpiCard
          label="Sessions"
          value={summary ? summary.month.sessions.toLocaleString() : "0"}
          loading={summaryLoading}
          subtitle="this month"
        />
      </div>

      {summaryError && (
        <div className="mb-6 px-4 py-2 rounded bg-red-900/30 border border-red-800 text-red-400 text-sm">
          Failed to load summary data. Retrying...
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <FilterChips
          label="Role"
          options={KNOWN_ROLES}
          selected={selectedRoles}
          onChange={setSelectedRoles}
        />
        <FilterChips
          label="Rig"
          options={KNOWN_RIGS}
          selected={selectedRigs}
          onChange={setSelectedRigs}
        />
      </div>

      {/* Filtered range summary */}
      {(selectedRoles.length > 0 || selectedRigs.length > 0) && (
        <div className="mb-6 px-4 py-3 bg-gray-900 rounded-lg border border-gray-800">
          <p className="text-sm text-gray-400">
            Filtered range: <span className="text-amber-400 font-medium">{formatUsd(filteredTotals.total)}</span>
            {" "}across <span className="text-amber-400 font-medium">{filteredTotals.sessions}</span> events
          </p>
        </div>
      )}

      {/* D3 Visualization placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 flex items-center justify-center text-gray-500">
          Cost River (D3) — Bead 5
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 flex items-center justify-center text-gray-500">
          Burn Rate Gauge (D3) — Bead 5
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 flex items-center justify-center text-gray-500">
          Heat Calendar (D3) — Bead 5
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 flex items-center justify-center text-gray-500">
          Role Treemap (D3) — Bead 5
        </div>
      </div>
    </div>
  );
}
