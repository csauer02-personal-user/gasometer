"use client";

import { useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { getRoleColor } from "@/lib/colors";
import { formatUsd } from "@/lib/format";

interface RoleEntry {
  role: string;
  total_usd: number;
  session_count: number;
}

interface RigEntry {
  rig: string | null;
  total_usd: number;
  session_count: number;
}

interface Props {
  roleData: RoleEntry[];
  rigData: RigEntry[];
}

interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
  role?: string;
}

export function RoleTreemap({ roleData, rigData }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const hierarchy = useMemo(() => {
    if (!roleData.length) return null;

    // Build a tree: root -> roles -> rigs (approximation: distribute rig costs proportionally)
    const totalAll = roleData.reduce((s, r) => s + r.total_usd, 0);

    const children: TreeNode[] = roleData.map((r) => {
      const rolePct = totalAll > 0 ? r.total_usd / totalAll : 0;
      const rigChildren: TreeNode[] = rigData
        .filter((rg) => rg.total_usd > 0)
        .map((rg) => ({
          name: rg.rig ?? "(none)",
          value: rg.total_usd * rolePct,
          role: r.role,
        }));

      if (rigChildren.length === 0) {
        return { name: r.role, value: r.total_usd, role: r.role };
      }

      return { name: r.role, children: rigChildren, role: r.role };
    });

    return { name: "root", children } as TreeNode;
  }, [roleData, rigData]);

  useEffect(() => {
    if (!svgRef.current || !hierarchy) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const root = d3
      .hierarchy(hierarchy)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<TreeNode>().size([width, height]).padding(2).round(true)(root);

    const leaves = root.leaves() as d3.HierarchyRectangularNode<TreeNode>[];

    const g = svg.selectAll("g").data(leaves).join("g");

    g.append("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("rx", 3)
      .attr("fill", (d) => {
        const role = d.data.role ?? d.parent?.data.name ?? "";
        return getRoleColor(role);
      })
      .attr("opacity", 0.8)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 1);
        const role = d.data.role ?? d.parent?.data.name ?? "";
        const [mx, my] = d3.pointer(event, container);
        tooltip
          .style("opacity", "1")
          .html(`<strong>${d.data.name}</strong><br/>${role}: ${formatUsd(d.value ?? 0)}`)
          .style("left", `${mx + 12}px`)
          .style("top", `${my - 10}px`);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.8);
        tooltip.style("opacity", "0");
      });

    // Labels
    g.append("text")
      .attr("x", (d) => d.x0 + 4)
      .attr("y", (d) => d.y0 + 14)
      .attr("fill", "white")
      .attr("font-size", (d) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w < 40 || h < 20) return "0px";
        return "11px";
      })
      .attr("font-weight", "500")
      .text((d) => d.data.name)
      .each(function (d) {
        const w = d.x1 - d.x0 - 8;
        const textEl = d3.select(this);
        const text = textEl.text();
        if (text.length * 6 > w) {
          textEl.text(text.slice(0, Math.floor(w / 6)) + "...");
        }
      });

    // Value labels
    g.append("text")
      .attr("x", (d) => d.x0 + 4)
      .attr("y", (d) => d.y0 + 26)
      .attr("fill", "rgba(255,255,255,0.7)")
      .attr("font-size", (d) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w < 50 || h < 35) return "0px";
        return "9px";
      })
      .text((d) => formatUsd(d.value ?? 0));
  }, [hierarchy]);

  if (!roleData.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No role data
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
