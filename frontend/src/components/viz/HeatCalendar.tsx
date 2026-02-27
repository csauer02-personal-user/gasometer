"use client";

import { useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { formatUsd } from "@/lib/format";

interface DailyEntry {
  date: string;
  total_usd: number;
}

interface Props {
  data: DailyEntry[];
  onDayClick?: (date: string) => void;
}

export function HeatCalendar({ data, onDayClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) {
      map.set(d.date, (map.get(d.date) ?? 0) + d.total_usd);
    }
    return map;
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;

    svg.selectAll("*").remove();

    const cellSize = Math.max(8, Math.min(14, (width - 60) / 53));
    const cellGap = 2;
    const height = (cellSize + cellGap) * 7 + 40;

    svg.attr("width", width).attr("height", height);

    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 86400000);

    const days: Date[] = [];
    const cursor = new Date(yearAgo);
    while (cursor <= now) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const maxVal = Math.max(...Array.from(dailyTotals.values()), 1);
    const colorScale = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxVal]);

    const weekOffset = yearAgo.getDay();

    svg
      .selectAll("rect.day")
      .data(days)
      .join("rect")
      .attr("class", "day")
      .attr("x", (_d, i) => {
        const week = Math.floor((i + weekOffset) / 7);
        return week * (cellSize + cellGap) + 30;
      })
      .attr("y", (d) => d.getDay() * (cellSize + cellGap) + 20)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("rx", 2)
      .attr("fill", (d) => {
        const dateStr = d.toISOString().split("T")[0];
        const val = dailyTotals.get(dateStr);
        if (!val) return "#1f2937";
        return colorScale(val);
      })
      .attr("stroke", "none")
      .style("cursor", onDayClick ? "pointer" : "default")
      .on("mouseenter", (event, d) => {
        const dateStr = d.toISOString().split("T")[0];
        const val = dailyTotals.get(dateStr) ?? 0;
        tooltip
          .style("opacity", "1")
          .text(`${dateStr}: ${formatUsd(val)}`);
        const [mx, my] = d3.pointer(event, container);
        tooltip.style("left", `${mx + 12}px`).style("top", `${my - 10}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
      })
      .on("click", (_event, d) => {
        if (onDayClick) onDayClick(d.toISOString().split("T")[0]);
      });

    // Day labels
    const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
    svg
      .selectAll("text.dayLabel")
      .data(dayLabels)
      .join("text")
      .attr("class", "dayLabel")
      .attr("x", 24)
      .attr("y", (_d, i) => i * (cellSize + cellGap) + 20 + cellSize * 0.8)
      .attr("text-anchor", "end")
      .attr("fill", "#6b7280")
      .attr("font-size", "9px")
      .text((d) => d);

    // Month labels
    const months: { label: string; x: number }[] = [];
    let lastMonth = -1;
    days.forEach((d, i) => {
      const m = d.getMonth();
      if (m !== lastMonth) {
        const week = Math.floor((i + weekOffset) / 7);
        months.push({
          label: d3.timeFormat("%b")(d),
          x: week * (cellSize + cellGap) + 30,
        });
        lastMonth = m;
      }
    });

    svg
      .selectAll("text.monthLabel")
      .data(months)
      .join("text")
      .attr("class", "monthLabel")
      .attr("x", (d) => d.x)
      .attr("y", 12)
      .attr("fill", "#6b7280")
      .attr("font-size", "9px")
      .text((d) => d.label);
  }, [dailyTotals, onDayClick]);

  return (
    <div className="relative w-full h-full overflow-x-auto">
      <svg ref={svgRef} className="w-full" />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded shadow opacity-0 transition-opacity"
      />
    </div>
  );
}
