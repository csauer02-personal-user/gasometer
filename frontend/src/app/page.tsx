"use client";

import { useState, useMemo } from "react";
import { useSummary, useDailyStats, useRoleStats, useRigStats, useCostEvents } from "@/hooks/useCostData";
import { formatUsd } from "@/lib/format";
import { KpiCard } from "@/components/ui/KpiCard";
import { FilterChips } from "@/components/ui/FilterChips";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { ROLE_COLORS } from "@/lib/colors";
import { CostRiver } from "@/components/viz/CostRiver";
import { BurnGauge } from "@/components/viz/BurnGauge";
import { HeatCalendar } from "@/components/viz/HeatCalendar";
import { FlameTimeline } from "@/components/viz/FlameTimeline";
import { RoleTreemap } from "@/components/viz/RoleTreemap";

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
  const { data: roleData } = useRoleStats(range.from, range.to);
  const { data: rigData } = useRigStats(range.from, range.to);
  const { data: costEvents } = useCostEvents(range.from, range.to);

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

  // Aggregate daily totals for heat calendar (collapse role dimension)
  const heatCalendarData = useMemo(() => {
    if (!dailyData?.data) return [];
    const map = new Map<string, number>();
    for (const d of dailyData.data) {
      map.set(d.date, (map.get(d.date) ?? 0) + d.total_usd);
    }
    return Array.from(map.entries()).map(([date, total_usd]) => ({ date, total_usd }));
  }, [dailyData]);

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

      {/* D3 Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-72" data-testid="cost-river">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Cost River</h3>
          <div className="h-[calc(100%-2rem)]">
            <CostRiver data={filteredDaily} />
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-72" data-testid="burn-gauge">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Burn Rate</h3>
          <div className="h-[calc(100%-2rem)]">
            <BurnGauge
              todayUsd={summary?.today.total_usd ?? 0}
              weekUsd={summary?.week.total_usd ?? 0}
              sessions={summary?.today.sessions ?? 0}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6" data-testid="heat-calendar">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Spend Calendar</h3>
        <div className="h-32">
          <HeatCalendar data={heatCalendarData} />
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 mb-6" data-testid="flame-timeline">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Session Timeline</h3>
        <div className="h-[calc(100%-2rem)]">
          <FlameTimeline data={costEvents?.data ?? []} />
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-72" data-testid="role-treemap">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Role Treemap</h3>
        <div className="h-[calc(100%-2rem)]">
          <RoleTreemap roleData={roleData?.data ?? []} rigData={rigData?.data ?? []} />
        </div>
      </div>
    </div>
  );
}
