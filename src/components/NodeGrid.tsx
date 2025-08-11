"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { type NodeType } from "@/lib/schemas";

type NodeGridProps = {
  nodes: Array<{
    id: string;
    label: string;
    type?: NodeType | null;
    colorHexLight?: string | null;
    colorHexDark?: string | null;
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
    colorHexLight?: string | null;
    colorHexDark?: string | null;
    imageMediaId?: string | null;
  };
  onSelect?: (id: string) => void;
}) => {
  return (
    <button
      onClick={() => onSelect?.(node.id)}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm transition hover:shadow-md dark:border-slate-700"
    >
      {/* background image */}
      {node.imageMediaId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/media/${node.imageMediaId}`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <div
            className="absolute inset-0 block dark:hidden"
            style={{ backgroundColor: node.colorHexLight ?? "#e2e8f0" }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{ backgroundColor: node.colorHexDark ?? "#1f2937" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <PlaceholderAvatar className="h-12 w-12" />
          </div>
        </>
      )}

      {/* dark gradient overlay bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* name label */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
        <div className="truncate text-left text-sm font-semibold text-white drop-shadow">
          {node.label}
        </div>
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
