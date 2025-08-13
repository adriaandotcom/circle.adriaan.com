"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type NodeType } from "@/lib/schemas";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { TrashIcon } from "@heroicons/react/24/outline";

const AddNodeModal = ({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (label: string, type: NodeType, color?: string) => Promise<void>;
  isCreating?: boolean;
}) => {
  const [tab, setTab] = useState<"automatic" | "manual" | "history">(
    "automatic"
  );
  const [label, setLabel] = useState("");
  const [type, setType] = useState<NodeType>("person");
  const [color, setColor] = useState<string>("#7c3aed");
  const [aiText, setAiText] = useState<string>("");
  const utils = api.useUtils();
  const ingest = api.ingest.process.useMutation({
    onSuccess: async () => {
      await utils.node.list.invalidate();
      await utils.event.invalidate();
      onOpenChange(false);
    },
  });
  const typeOptions: Array<{ value: NodeType; label: string }> = [
    { value: "person", label: "Person" },
    { value: "group", label: "Group" },
    { value: "company", label: "Company" },
  ];
  const typeToRingClass: Record<NodeType, string> = {
    company: "ring-2 ring-orange-400",
    person: "ring-0",
    group: "ring-2 ring-purple-400",
  };

  const isNodeType = (v: string | null): v is NodeType =>
    v === "company" || v === "person" || v === "group";

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setAiText("");
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("last-node-type")
        : null;
    setType(isNodeType(saved) ? saved : "person");
    const savedColor =
      typeof window !== "undefined"
        ? localStorage.getItem("last-group-color")
        : null;
    if (savedColor) setColor(savedColor);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const submitManual = async () => {
    if (!label.trim()) return;
    await onCreate(label.trim(), type, type === "group" ? color : undefined);
    if (typeof window !== "undefined")
      localStorage.setItem("last-node-type", type);
    if (typeof window !== "undefined" && type === "group")
      localStorage.setItem("last-group-color", color);
    onOpenChange(false);
  };

  const submitAutomatic = async () => {
    const text = aiText.trim();
    if (!text) return;
    await ingest.mutateAsync({ text });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-node-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
        <div className="mb-4 flex items-start justify-between">
          <h3
            id="add-node-title"
            className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          >
            Add item
          </h3>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            ×
          </Button>
        </div>
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2 text-sm dark:border-slate-700">
          {[
            { k: "automatic", label: "Automatic" },
            { k: "manual", label: "Manual" },
            { k: "history", label: "History" },
          ].map((t) => (
            <button
              key={t.k}
              className={`rounded px-3 py-1 ${
                tab === (t.k as any)
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
              onClick={() => setTab(t.k as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "manual" ? (
          <div className="space-y-4">
            <Input
              placeholder="Enter name..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setType(opt.value);
                    if (typeof window !== "undefined")
                      localStorage.setItem("last-node-type", opt.value);
                  }}
                  className={
                    `flex items-center justify-start gap-3 rounded-xl border p-3 text-sm shadow-sm transition ` +
                    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/80 dark:focus-visible:ring-white/80 ` +
                    (type === opt.value
                      ? `border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800`
                      : `border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600`)
                  }
                >
                  <span
                    className={
                      `flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-offset-2 dark:bg-slate-800 ` +
                      typeToRingClass[opt.value]
                    }
                    aria-hidden="true"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
            {type === "group" ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Group color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-900"
                    aria-label="Pick group color"
                  />
                  <div
                    className="h-6 w-6 rounded-full border border-slate-300"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "automatic" ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Type anything… e.g. I met @https://x.com/mikewiendels yesterday via Group X and he works on example.com"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Uses AI to extract the right person or organization and attach
              your note.
            </div>
          </div>
        ) : null}

        {tab === "history" ? (
          <div className="space-y-3">
            <HistoryList />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            className="px-4"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {tab === "manual" ? (
            <Button
              disabled={!label.trim() || !!isCreating}
              onClick={submitManual}
              className="px-5"
            >
              Add
            </Button>
          ) : (
            <Button
              disabled={!aiText.trim() || ingest.isPending}
              onClick={submitAutomatic}
              className="px-5"
            >
              {ingest.isPending ? "Adding…" : "Add"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddNodeModal;

function HistoryList() {
  const aiEvents = api.event.recentAi.useQuery();
  const aiNodes = api.node.recentAi.useQuery();
  const utils = api.useUtils();
  const delEvent = api.event.delete.useMutation({
    onSuccess: async () => {
      await utils.event.recentAi.invalidate();
    },
  });
  const delNode = api.node.delete.useMutation({
    onSuccess: async () => {
      await utils.node.recentAi.invalidate();
      await utils.node.list.invalidate();
    },
  });
  const events = (aiEvents.data ?? []) as Array<{
    id: string;
    createdAt: string | Date;
    description?: string | null;
    nodeId?: string | null;
    nodeLabel?: string | null;
  }>;
  const nodes = (aiNodes.data ?? []) as Array<{
    id: string;
    label: string;
    type: string | null;
    createdAt: string | Date;
  }>;
  const items = [
    ...events.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      kind: "event" as const,
      title: e.nodeLabel ?? "(unknown)",
      description: e.description ?? "",
    })),
    ...nodes.map((n) => ({
      id: n.id,
      createdAt: n.createdAt,
      kind: "node" as const,
      title: n.label,
      description: "",
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  if (!items.length)
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        No recent AI additions.
      </div>
    );
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li
          key={`${it.kind}-${it.id}`}
          className="flex items-start justify-between rounded border border-slate-200 p-2 text-sm dark:border-slate-700"
        >
          <div className="mr-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{it.title}</span>
              <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300">
                {it.kind}
              </span>
            </div>
            {it.description ? (
              <div className="text-slate-600 dark:text-slate-300 line-clamp-2">
                {it.description}
              </div>
            ) : null}
          </div>
          <button
            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={async () => {
              if (it.kind === "event") {
                if (!confirm("Delete this AI-added event?")) return;
                await delEvent.mutateAsync({ id: it.id });
              } else {
                if (
                  !confirm(
                    "Delete this AI-created node? This will remove its data."
                  )
                )
                  return;
                await delNode.mutateAsync({ id: it.id });
              }
            }}
          >
            <TrashIcon className="h-5 w-5 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100" />
          </button>
        </li>
      ))}
    </ul>
  );
}
