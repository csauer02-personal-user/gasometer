"use client";

import { useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { getRoleColor } from "@/lib/colors";
import { formatUsd } from "@/lib/format";

interface DailyEntry {
  date: string;
  role: string;
  total_usd: number;
}

interface Props {
  data: DailyEntry[];
}

export function CostRiver({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const { pivoted, roles, dates } = useMemo(() => {
    if (!data.length) return { pivoted: [], roles: [], dates: [] };

    const roleSet = new Set<string>();
    const dateMap = new Map<string, Record<string, number>>();

    for (const d of data) {
      roleSet.add(d.role);
      if (!dateMap.has(d.date)) dateMap.set(d.date, {});
      const entry = dateMap.get(d.date)!;
      entry[d.role] = (entry[d.role] ?? 0) + d.total_usd;
    }

    const sortedRoles = Array.from(roleSet).sort();
    const sortedDates = Array.from(dateMap.keys()).sort();

    const pivotedData = sortedDates.map((date) => {
      const row: Record<string, number | string> = { date };
      for (const role of sortedRoles) {
        row[role] = dateMap.get(date)?.[role] ?? 0;
      }
      return row;
    });

    return { pivoted: pivotedData, roles: sortedRoles, dates: sortedDates };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !pivoted.length) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const x = d3
      .scaleTime()
      .domain([new Date(dates[0]), new Date(dates[dates.length - 1])])
      .range([margin.left, width - margin.right]);

    const stack = d3.stack<Record<string, number | string>>().keys(roles);
    const series = stack(pivoted as Iterable<Record<string, number | string>>);

    const yMax = d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 0;
    const y = d3
      .scaleLinear()
      .domain([0, yMax * 1.1])
      .range([height - margin.bottom, margin.top]);

    const area = d3
      .area<d3.SeriesPoint<Record<string, number | string>>>()
      .x((d) => x(new Date(d.data.date as string)))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    svg
      .append("g")
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", (d) => getRoleColor(d.key))
      .attr("opacity", 0.85)
      .attr("d", area)
      .on("mouseenter", function (_event, d) {
        d3.select(this).attr("opacity", 1);
        tooltip.style("opacity", "1").text(d.key);
      })
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event, container);
        tooltip
          .style("left", `${mx + 12}px`)
          .style("top", `${my - 10}px`);

        const dateAtX = x.invert(d3.pointer(event, svgRef.current)[0]);
        const dateStr = dateAtX.toISOString().split("T")[0];
        const match = pivoted.find((p) => p.date === dateStr);
        if (match) {
          const total = roles.reduce((s, r) => s + (Number(match[r]) || 0), 0);
          tooltip.text(`${dateStr}: ${formatUsd(total)}`);
        }
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.85);
        tooltip.style("opacity", "0");
      });

    // X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %d") as (d: Date | d3.NumberValue, i: number) => string))
      .attr("class", "text-gray-400")
      .selectAll("text")
      .attr("fill", "#9ca3af");

    // Y axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `$${d}`))
      .attr("class", "text-gray-400")
      .selectAll("text")
      .attr("fill", "#9ca3af");

    // Style axis lines
    svg.selectAll(".domain, .tick line").attr("stroke", "#374151");
  }, [pivoted, roles, dates]);

  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded shadow opacity-0 transition-opacity"
      />
    </div>
  );
}
