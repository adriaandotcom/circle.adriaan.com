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
    { value: "location", label: "Location" },
  ];
  const typeToRingClass: Record<NodeType, string> = {
    company: "ring-4 ring-orange-400",
    person: "ring-0",
    group: "ring-4 ring-purple-400",
    location: "ring-4 ring-sky-400",
  };

  const isNodeType = (v: string | null): v is NodeType =>
    v === "company" || v === "person" || v === "group" || v === "location";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-node-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h3
            id="add-node-title"
            className="text-base font-semibold text-slate-800 dark:text-slate-100"
          >
            Add item
          </h3>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            ×
          </Button>
        </div>
        <div className="space-y-3">
          <Input
            placeholder="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
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
                  `flex items-center justify-center gap-2 rounded-lg border bg-white p-3 text-sm transition dark:bg-slate-900 ` +
                  (type === opt.value
                    ? `border-slate-900 ring-2 ring-slate-900 dark:border-white dark:ring-white`
                    : `border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600`)
                }
              >
                <span
                  className={
                    `flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 ring-offset-2 dark:bg-slate-800 ` +
                    typeToRingClass[opt.value]
                  }
                  aria-hidden="true"
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!label.trim() || !!isCreating} onClick={submit}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddNodeModal;
