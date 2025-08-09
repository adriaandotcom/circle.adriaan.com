"use client";

import NodeAutocomplete, {
  type Option as NodeOption,
} from "@/components/NodeAutocomplete";
import { useState } from "react";

export default function CreateLinkForm({
  nodes,
  onCreate,
}: {
  nodes: Array<{ id: string; label: string }>;
  onCreate: (a: string, b: string, role: string) => Promise<void> | void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [role, setRole] = useState("");

  const options: NodeOption[] = nodes.map((n) => ({
    id: n.id,
    label: n.label,
  }));

  return (
    <div className="grid grid-cols-4 gap-2">
      <NodeAutocomplete
        options={options}
        value={a}
        onChange={setA}
        placeholder="Select node"
      />
      <NodeAutocomplete
        options={options}
        value={b}
        onChange={setB}
        placeholder="Select node"
      />
      <NodeAutocomplete
        options={[]}
        value={role}
        onChange={setRole}
        placeholder="Role (optional)"
        freeText
      />
      <button
        className="rounded-md bg-slate-900 px-3 py-2 text-slate-100 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        disabled={!a || !b}
        onClick={async () => {
          await onCreate(a, b, role);
        }}
      >
        Link
      </button>
    </div>
  );
}
