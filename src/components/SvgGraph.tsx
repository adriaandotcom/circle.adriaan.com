"use client";

import { useMemo, useState } from "react";
import {
  BuildingOfficeIcon,
  UserIcon,
  UsersIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";

export type SvgNode = {
  id: string;
  label?: string;
  type?: "company" | "person" | "group" | "location" | string;
};
export type SvgLink = { id?: string; source: string; target: string };

type Props = {
  nodes: SvgNode[];
  links: SvgLink[];
  dark?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
};

// Simple, dependency-free 2D SVG graph: nodes arranged on a circle with straight edges
const SvgGraph = ({ nodes, links, dark, onSelect, selectedId }: Props) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const neighborsById = useMemo(() => {
    const map = new Map<string, Set<string>>();
    nodes.forEach((n) => map.set(n.id, new Set<string>()));
    links.forEach((l) => {
      const a = map.get(l.source) ?? new Set<string>();
      const b = map.get(l.target) ?? new Set<string>();
      a.add(l.target);
      b.add(l.source);
      map.set(l.source, a);
      map.set(l.target, b);
    });
    return map;
  }, [nodes, links]);
  const { laidOutNodes, nodeIndex } = useMemo(() => {
    const count = nodes.length || 1;
    const radius = 380;
    const center = 500;
    const idx: Record<string, number> = {};
    nodes.forEach((node, i) => (idx[node.id] = i));

    // Which node should be centered?
    let centerId: string | undefined = undefined;
    if (selectedId && nodes.some((n) => n.id === selectedId))
      centerId = selectedId;
    else {
      const firstPerson = nodes.find((n) => (n as any).type === "person");
      centerId = firstPerson?.id ?? nodes[0]?.id;
    }

    // If no nodes, return empty
    if (!nodes.length)
      return {
        laidOutNodes: [] as Array<SvgNode & { x: number; y: number }>,
        nodeIndex: idx,
      };

    // Place center node at middle; others around circle
    const others = nodes.filter((n) => n.id !== centerId);
    const laid: Array<SvgNode & { x: number; y: number }> = [];
    // center first
    const centerNode = nodes.find((n) => n.id === centerId)!;
    laid.push({ ...centerNode, x: center, y: center });
    // distribute others
    const m = others.length || 1;
    others.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / m - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      laid.push({ ...node, x, y });
    });

    return { laidOutNodes: laid, nodeIndex: idx };
  }, [nodes, selectedId]);

  const getPoint = (id: string) => {
    const i = nodeIndex[id];
    return laidOutNodes[i] ?? { x: 0, y: 0 };
  };

  const stroke = dark ? "#94a3b8" : "#64748b"; // slate tones
  const text = dark ? "#ffffff" : "#0f172a";
  const personFill = dark ? "#1f2937" : "#e2e8f0";
  const nodeStroke = dark ? "#475569" : "#94a3b8";

  const fillByType = (type?: string) => {
    if (type === "person" || !type) return personFill; // keep persons as they are
    if (type === "company") return dark ? "#60a5fa" : "#3b82f6"; // blue
    if (type === "group") return dark ? "#22d3ee" : "#06b6d4"; // cyan
    if (type === "location") return dark ? "#f59e0b" : "#d97706"; // amber
    return personFill;
  };

  return (
    <div className="h-full w-full">
      <svg viewBox="0 0 1000 1000" className="h-full w-full">
        {/* edges */}
        <g stroke={stroke} strokeWidth={2}>
          {links.map((l) => {
            const a = getPoint(l.source);
            const b = getPoint(l.target);
            const isActiveLink =
              hoveredNodeId != null &&
              (l.source === hoveredNodeId || l.target === hoveredNodeId);
            return (
              <line
                key={l.id ?? `${l.source}-${l.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeOpacity={
                  isActiveLink || hoveredNodeId == null ? 0.9 : 0.2
                }
              />
            );
          })}
        </g>

        {/* nodes */}
        <g>
          {laidOutNodes.map((n) => {
            const neighborSet = neighborsById.get(n.id);
            const isConnected =
              hoveredNodeId != null &&
              (n.id === hoveredNodeId ||
                neighborSet?.has(hoveredNodeId) ||
                neighborSet?.has(hoveredNodeId as string));
            const activeFill = dark ? "#94a3b8" : "#334155";
            const baseFill = fillByType((n as any).type);
            const circleFill = isConnected ? activeFill : baseFill;
            const circleR = isConnected ? 16 : 14;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onMouseEnter={() => setHoveredNodeId(n.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => onSelect?.(n.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r={circleR}
                  fill={circleFill}
                  stroke={nodeStroke}
                  strokeWidth={2}
                />
                {(() => {
                  const size = 12;
                  const common = {
                    x: -size / 2,
                    y: -size / 2,
                    width: size,
                    height: size,
                  } as const;
                  const type = (n as any).type as string | undefined;
                  if (type === "company")
                    return <BuildingOfficeIcon {...common} fill={text} />;
                  if (type === "group")
                    return <UsersIcon {...common} fill={text} />;
                  if (type === "location")
                    return <MapPinIcon {...common} fill={text} />;
                  return <UserIcon {...common} fill={text} />;
                })()}
                {n.label ? (
                  <text
                    x={0}
                    y={-20}
                    textAnchor="middle"
                    fontSize={14}
                    fill={text}
                    style={{ pointerEvents: "none" }}
                  >
                    {((n as any).type === "person"
                      ? (n.label || "").split(" ")[0]
                      : n.label) || ""}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default SvgGraph;
