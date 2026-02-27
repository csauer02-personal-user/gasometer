"use client";

import { useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { getRoleColor } from "@/lib/colors";
import { formatUsd } from "@/lib/format";

interface Session {
  session_id: string;
  role: string;
  cost_usd: number;
  duration_sec: number | null;
  ended_at: string;
}

interface Props {
  data: Session[];
}

export function FlameTimeline({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const sessions = useMemo(() => {
    if (!data.length) return [];
    return data
      .filter((d) => d.duration_sec && d.duration_sec > 0)
      .map((d) => {
        const end = new Date(d.ended_at);
        const start = new Date(end.getTime() - (d.duration_sec ?? 0) * 1000);
        return { ...d, start, end };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !sessions.length) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const timeExtent = [
      d3.min(sessions, (s) => s.start)!,
      d3.max(sessions, (s) => s.end)!,
    ];

    const x = d3
      .scaleTime()
      .domain(timeExtent)
      .range([margin.left, width - margin.right]);

    // Assign lanes using a greedy algorithm
    const lanes: { end: number }[] = [];
    const sessionLanes: number[] = [];

    for (const s of sessions) {
      let assigned = false;
      for (let i = 0; i < lanes.length; i++) {
        if (s.start.getTime() >= lanes[i].end) {
          lanes[i].end = s.end.getTime();
          sessionLanes.push(i);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        lanes.push({ end: s.end.getTime() });
        sessionLanes.push(lanes.length - 1);
      }
    }

    const laneCount = lanes.length;
    const laneH = Math.min(20, (height - margin.top - margin.bottom) / Math.max(laneCount, 1));
    const maxCost = d3.max(sessions, (s) => s.cost_usd) ?? 1;
    const opacityScale = d3.scaleLinear().domain([0, maxCost]).range([0.3, 1]);

    svg
      .selectAll("rect.session")
      .data(sessions)
      .join("rect")
      .attr("class", "session")
      .attr("x", (d) => x(d.start))
      .attr("y", (_d, i) => margin.top + sessionLanes[i] * (laneH + 2))
      .attr("width", (d) => Math.max(2, x(d.end) - x(d.start)))
      .attr("height", laneH)
      .attr("rx", 3)
      .attr("fill", (d) => getRoleColor(d.role))
      .attr("opacity", (d) => opacityScale(d.cost_usd))
      .on("mouseenter", (event, d) => {
        const [mx, my] = d3.pointer(event, container);
        tooltip
          .style("opacity", "1")
          .html(
            `<strong>${d.session_id}</strong><br/>` +
            `${d.role} | ${formatUsd(d.cost_usd)}<br/>` +
            `${Math.round((d.duration_sec ?? 0) / 60)}min`
          )
          .style("left", `${mx + 12}px`)
          .style("top", `${my - 10}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
      });

    // X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %d %H:%M") as (d: Date | d3.NumberValue, i: number) => string))
      .selectAll("text")
      .attr("fill", "#9ca3af")
      .attr("font-size", "9px");

    svg.selectAll(".domain, .tick line").attr("stroke", "#374151");

    // Y label
    svg
      .append("text")
      .attr("x", 10)
      .attr("y", margin.top - 6)
      .attr("fill", "#6b7280")
      .attr("font-size", "10px")
      .text("Sessions");
  }, [sessions]);

  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No session data
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded shadow opacity-0 transition-opacity z-10"
      />
    </div>
  );
}
