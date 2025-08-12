"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type NodeType } from "@/lib/schemas";

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
  const [tab, setTab] = useState<"manual" | "automatic">("manual");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<NodeType>("person");
  const [color, setColor] = useState<string>("#7c3aed");
  const [url, setUrl] = useState<string>("");
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
    setUrl("");
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

  const extractLabelFromUrl = (u: string): string => {
    try {
      const str = u.trim();
      const m = str.match(
        /https?:\/\/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})(?:[\/?].*)?/i
      );
      if (m?.[1]) return m[1].toLowerCase();
      const urlObj = new URL(str);
      const path = urlObj.pathname.split("/").filter(Boolean)[0];
      return path || urlObj.hostname;
    } catch {
      return u.trim();
    }
  };

  const submitAutomatic = async () => {
    const lbl = extractLabelFromUrl(url);
    if (!lbl) return;
    await onCreate(lbl, "person", undefined);
    onOpenChange(false);
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
            { k: "manual", label: "Manual" },
            { k: "automatic", label: "Automatic" },
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
          <div className="space-y-4">
            <Input
              placeholder="Paste a URL (e.g. https://x.com/username)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              We'll extract a name from the URL. Twitter/X handles become the
              item name.
            </div>
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
              disabled={!url.trim() || !!isCreating}
              onClick={submitAutomatic}
              className="px-5"
            >
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddNodeModal;
