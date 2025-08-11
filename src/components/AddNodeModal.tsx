"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NodeType = "company" | "person" | "group" | "location";

export default function AddNodeModal({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (label: string, type: NodeType) => Promise<void>;
  isCreating?: boolean;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<NodeType>("person");

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setType("person");
  }, [open]);

  const submit = async () => {
    if (!label.trim()) return;
    await onCreate(label.trim(), type);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-node-title"
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
          <Select value={type} onValueChange={(v) => setType(v as NodeType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="person">Person</SelectItem>
              <SelectItem value="group">Group</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="location">Location</SelectItem>
            </SelectContent>
          </Select>
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
}
