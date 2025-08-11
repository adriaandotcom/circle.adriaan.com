"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { type NodeType } from "@/lib/schemas";

type NodeGridProps = {
  nodes: Array<{
    id: string;
    label: string;
    type?: NodeType | null;
    color?: string | null;
    imageMediaId?: string | null;
  }>;
  onSelect?: (id: string) => void;
};

const typeToRingClass: Record<NodeType, string> = {
  company: "ring-2 ring-orange-400",
  person: "ring-0",
  group: "ring-2 ring-purple-400",
};

const PlaceholderAvatar = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={cn("h-10 w-10 text-slate-400", className)}
  >
    <path
      fill="currentColor"
      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
    />
  </svg>
);

const NodeCard = ({
  node,
  onSelect,
}: {
  node: {
    id: string;
    label: string;
    type?: NodeType | null;
    color?: string | null;
    imageMediaId?: string | null;
  };
  onSelect?: (id: string) => void;
}) => {
  const ringClass = typeToRingClass[(node.type ?? "person") as NodeType];
  return (
    <button
      onClick={() => onSelect?.(node.id)}
      className="group flex flex-col items-center justify-start rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:shadow dark:border-slate-700 dark:bg-slate-900"
    >
      <div
        className={cn(
          "mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800",
          // When a custom color is provided for a group, draw the ring via box-shadow only
          node.type === "group" && node.color ? `ring-0` : ringClass
        )}
        style={
          node.type === "group" && node.color
            ? ({ boxShadow: `0 0 0 2px ${node.color}` } as React.CSSProperties)
            : undefined
        }
      >
        {node.imageMediaId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${node.imageMediaId}`}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <PlaceholderAvatar />
        )}
      </div>
      <div className="line-clamp-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white">
        {node.label}
      </div>
    </button>
  );
};

const NodeGrid = ({ nodes, onSelect }: NodeGridProps) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
    {nodes.map((n) => (
      <NodeCard key={n.id} node={n} onSelect={onSelect} />
    ))}
  </div>
);

export default NodeGrid;
