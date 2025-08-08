"use client";
import { useState } from "react";
import { api } from "@/trpc/react";

export default function Home() {
  const utils = api.useUtils();
  const nodes = api.node.list.useQuery();
  const createNode = api.node.create.useMutation({
    onSuccess: async () => {
      await utils.node.list.invalidate();
    },
  });
  const createLink = api.link.create.useMutation({
    onSuccess: async () => {
      await utils.link.invalidate();
    },
  });

  const [label, setLabel] = useState("");
  type NodeType = "company" | "person" | "group";
  const [type, setType] = useState<"" | NodeType>("");
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const nodeItems = (nodes.data ?? []) as Array<{ id: string; label: string }>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Nodes
        </h1>
        <div className="grid grid-cols-3 gap-2">
          <input
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            placeholder="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={type}
            onChange={(e) => setType(e.target.value as "" | NodeType)}
          >
            <option value="">Type</option>
            <option value="company">Company</option>
            <option value="person">Person</option>
            <option value="group">Group</option>
          </select>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-slate-100 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            disabled={!label || createNode.isPending}
            onClick={async () => {
              const nodeType: NodeType | undefined =
                type === "" ? undefined : type;
              await createNode.mutateAsync({ label, type: nodeType });
              setLabel("");
              setType("");
            }}
          >
            Add Node
          </button>
        </div>
        <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300">
          {nodeItems.map((n) => (
            <li key={n.id}>{n.label}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
          Create Link
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={a}
            onChange={(e) => setA(e.target.value)}
          >
            <option value="">Node A</option>
            {nodeItems.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={b}
            onChange={(e) => setB(e.target.value)}
          >
            <option value="">Node B</option>
            {nodeItems.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-slate-100 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            disabled={!a || !b || createLink.isPending}
            onClick={async () => {
              await createLink.mutateAsync({ nodeIds: [a, b] });
              setA("");
              setB("");
            }}
          >
            Link Nodes
          </button>
        </div>
      </section>
    </main>
  );
}
