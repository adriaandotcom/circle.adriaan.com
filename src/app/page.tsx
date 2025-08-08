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
  const deleteNode = api.node.delete.useMutation({
    onSuccess: async () => {
      await utils.node.list.invalidate();
      await utils.link.invalidate();
    },
  });
  const deleteLink = api.link.delete.useMutation({
    onSuccess: async () => {
      await utils.link.invalidate();
    },
  });

  const [label, setLabel] = useState("");
  type NodeType = "company" | "person" | "group";
  const [type, setType] = useState<"" | NodeType>("");
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const nodeItems = (nodes.data ?? []) as Array<{
    id: string;
    label: string;
    type: ("company" | "person" | "group") | null | undefined;
  }>;

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
            <option value="" disabled>
              Select type
            </option>
            <option value="company">Company</option>
            <option value="person" selected={true}>
              Person
            </option>
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
        <ul className="space-y-2 pl-0 text-slate-700 dark:text-slate-300">
          {nodeItems.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
            >
              <span className="flex items-center gap-2">
                {n.label}
                {n.type && n.type !== "person" ? (
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:text-slate-300">
                    {n.type}
                  </span>
                ) : null}
              </span>
              <button
                className="rounded-md bg-slate-200 px-2 py-1 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                onClick={async () => {
                  if (confirm("Are you sure you want to delete this node?")) {
                    await deleteNode.mutateAsync({ id: n.id });
                  }
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
          Create link
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={a}
            onChange={(e) => setA(e.target.value)}
          >
            <option value="" selected disabled>
              Select node
            </option>
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
            <option value="" selected disabled>
              Select node
            </option>
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
          Links
        </h2>
        <LinksList />
      </section>
    </main>
  );
}

function LinksList() {
  const utils = api.useUtils();
  const links = api.link.list.useQuery();
  const del = api.link.delete.useMutation({
    onSuccess: async () => {
      await utils.link.invalidate();
    },
  });
  const items = (links.data ?? []) as Array<{
    id: string;
    nodeA: { id: string; label: string };
    nodeB: { id: string; label: string };
  }>;
  return (
    <ul className="space-y-2">
      {items.map((l) => (
        <li
          key={l.id}
          className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
        >
          <span>
            {l.nodeA.label} ↔ {l.nodeB.label}
          </span>
          <button
            className="rounded-md bg-slate-200 px-2 py-1 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            onClick={async () => {
              if (confirm("Are you sure you want to delete this link?")) {
                await del.mutateAsync({ id: l.id });
              }
            }}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
