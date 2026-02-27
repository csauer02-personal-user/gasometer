"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import { formatUsd } from "@/lib/format";

interface Props {
  todayUsd: number;
  weekUsd: number;
  sessions: number;
}

const THRESHOLDS = {
  green: 10,
  yellow: 25,
};

function getZoneColor(rate: number): string {
  if (rate <= THRESHOLDS.green) return "#10b981";
  if (rate <= THRESHOLDS.yellow) return "#f59e0b";
  return "#ef4444";
}

export function BurnGauge({ todayUsd, weekUsd, sessions }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const hourlyRate = todayUsd / Math.max(new Date().getHours(), 1);
  const dailyAvg = weekUsd / 7;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svgRef.current.parentElement!;
    const size = Math.min(container.clientWidth, container.clientHeight);
    const cx = size / 2;
    const cy = size / 2 + 10;
    const outerR = size / 2 - 15;
    const innerR = outerR - 18;

    svg.attr("width", size).attr("height", size);
    svg.selectAll("*").remove();

    const maxBurn = Math.max(THRESHOLDS.yellow * 2, todayUsd * 1.5, 50);
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    const angleScale = d3.scaleLinear().domain([0, maxBurn]).range([startAngle, endAngle]).clamp(true);

    const arc = d3.arc<{ startAngle: number; endAngle: number }>().innerRadius(innerR).outerRadius(outerR).cornerRadius(3);

    // Background track
    svg
      .append("path")
      .datum({ startAngle, endAngle })
      .attr("d", arc)
      .attr("transform", `translate(${cx},${cy})`)
      .attr("fill", "#1f2937");

    // Green zone
    svg
      .append("path")
      .datum({ startAngle, endAngle: angleScale(THRESHOLDS.green) })
      .attr("d", arc)
      .attr("transform", `translate(${cx},${cy})`)
      .attr("fill", "#10b981")
      .attr("opacity", 0.3);

    // Yellow zone
    svg
      .append("path")
      .datum({ startAngle: angleScale(THRESHOLDS.green), endAngle: angleScale(THRESHOLDS.yellow) })
      .attr("d", arc)
      .attr("transform", `translate(${cx},${cy})`)
      .attr("fill", "#f59e0b")
      .attr("opacity", 0.3);

    // Red zone
    svg
      .append("path")
      .datum({ startAngle: angleScale(THRESHOLDS.yellow), endAngle })
      .attr("d", arc)
      .attr("transform", `translate(${cx},${cy})`)
      .attr("fill", "#ef4444")
      .attr("opacity", 0.3);

    // Value arc (animated)
    const valueArc = svg
      .append("path")
      .datum({ startAngle, endAngle: startAngle })
      .attr("d", arc)
      .attr("transform", `translate(${cx},${cy})`)
      .attr("fill", getZoneColor(todayUsd));

    valueArc
      .transition()
      .duration(1000)
      .ease(d3.easeCubicOut)
      .attrTween("d", function () {
        const interpolate = d3.interpolate(startAngle, angleScale(todayUsd));
        return (t: number) => arc({ startAngle, endAngle: interpolate(t) }) ?? "";
      });

    // Center text: today spend
    svg
      .append("text")
      .attr("x", cx)
      .attr("y", cy - 8)
      .attr("text-anchor", "middle")
      .attr("fill", getZoneColor(todayUsd))
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .text(formatUsd(todayUsd));

    // Label: "today"
    svg
      .append("text")
      .attr("x", cx)
      .attr("y", cy + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ca3af")
      .attr("font-size", "11px")
      .text("today");

    // Hourly rate
    svg
      .append("text")
      .attr("x", cx)
      .attr("y", cy + 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#6b7280")
      .attr("font-size", "10px")
      .text(`~${formatUsd(hourlyRate)}/hr | avg ${formatUsd(dailyAvg)}/day`);

    // Sessions count
    svg
      .append("text")
      .attr("x", cx)
      .attr("y", cy + 44)
      .attr("text-anchor", "middle")
      .attr("fill", "#4b5563")
      .attr("font-size", "10px")
      .text(`${sessions} sessions`);
  }, [todayUsd, weekUsd, sessions, hourlyRate, dailyAvg]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg ref={svgRef} />
    </div>
  );
}
