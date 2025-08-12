"use client";

import NodeAutocomplete, {
  type Option as NodeOption,
} from "@/components/NodeAutocomplete";
import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";

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
  const allRoles = api.link.roles.useQuery();

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
        options={(
          (allRoles.data ?? []) as Array<{ id: string; name: string }>
        ).map((r) => ({ id: r.name, label: r.name }))}
        value={role}
        onChange={setRole}
        placeholder="Role (optional)"
        freeText
      />
      <Button
        disabled={!a || !b}
        onClick={async () => {
          await onCreate(a, b, role);
        }}
      >
        Link
      </Button>
    </div>
  );
}
