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
  onCreate: (label: string, type: NodeType) => Promise<void>;
  isCreating?: boolean;
}) => {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<NodeType>("person");
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
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("last-node-type")
        : null;
    setType(isNodeType(saved) ? saved : "person");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const submit = async () => {
    if (!label.trim()) return;
    await onCreate(label.trim(), type);
    if (typeof window !== "undefined")
      localStorage.setItem("last-node-type", type);
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
        <div className="space-y-4">
          <Input
            placeholder="Label"
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
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            className="px-4"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!label.trim() || !!isCreating}
            onClick={submit}
            className="px-5"
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddNodeModal;
