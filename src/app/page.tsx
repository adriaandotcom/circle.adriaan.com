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
  // link delete handled in LinksList

  const [label, setLabel] = useState("");
  const [linkRole, setlinkRole] = useState("");
  type NodeType = "company" | "person" | "group" | "location";
  const [type, setType] = useState<"" | NodeType>("person");
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const nodeItems = (nodes.data ?? []) as Array<{
    id: string;
    label: string;
    type: ("company" | "person" | "group" | "location") | null | undefined;
  }>;
  // events handled within NodeRow

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Items
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
            <option value="person">Person</option>
            <option value="group">Group</option>
            <option value="company">Company</option>
            <option value="location">Location</option>
          </select>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-slate-100 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            disabled={!label || createNode.isPending}
            onClick={async () => {
              await createNode.mutateAsync({ label, type });
              setLabel("");
            }}
          >
            Add item
          </button>
        </div>
        <ul className="space-y-2 pl-0 text-slate-700 dark:text-slate-300">
          {nodeItems.map((n) => (
            <NodeRow key={n.id} node={n} />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
          Create link
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={a}
            onChange={(e) => setA(e.target.value)}
          >
            <option value="" disabled>
              Select node
            </option>
            {nodeItems.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
          <input
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            placeholder="Role (optional)"
            value={linkRole}
            onChange={(e) => setlinkRole(e.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={b}
            onChange={(e) => setB(e.target.value)}
          >
            <option value="" disabled>
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
              await createLink.mutateAsync({ role: linkRole, nodeIds: [a, b] });
            }}
          >
            Link
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

function NodeRow({
  node,
}: {
  node: {
    id: string;
    label: string;
    type?: "company" | "person" | "group" | "location" | null;
  };
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const addEvent = api.event.create.useMutation({
    onSuccess: async () => {
      await utils.event.invalidate();
    },
  });
  const events = api.event.list.useQuery(
    { nodeId: node.id },
    { enabled: open }
  );
  const deleteNode = api.node.delete.useMutation({
    onSuccess: async () => {
      await utils.node.list.invalidate();
      await utils.link.invalidate();
    },
  });
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-NL", {
      year: "numeric",
      month: "long",
      weekday: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(new Date(date));

  return (
    <li className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <button
          className="text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            {node.label}
            {node.type && node.type !== "person" ? (
              <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:text-slate-300">
                {node.type}
              </span>
            ) : null}
          </span>
        </button>
        <button
          className="ml-auto rounded-md bg-slate-200 px-2 py-1 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Comment
        </button>
        <button
          className="ml-2 rounded-md bg-slate-200 px-2 py-1 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          onClick={async () => {
            if (confirm("Are you sure you want to delete this node?")) {
              await deleteNode.mutateAsync({ id: node.id });
            }
          }}
        >
          Delete
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2">
            <textarea
              className="min-h-[60px] w-full rounded-md border border-slate-300 bg-white p-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Add a note, place, or link..."
              id={`event-${node.id}`}
            />
            <button
              className="rounded-md bg-slate-900 px-2 py-1 text-slate-100 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 whitespace-nowrap"
              onClick={async () => {
                const el = document.getElementById(
                  `event-${node.id}`
                ) as HTMLTextAreaElement | null;
                const description = el?.value?.trim() ?? "";
                if (!description) return;
                await addEvent.mutateAsync({ nodeId: node.id, description });
                if (el) el.value = "";
                await events.refetch();
              }}
            >
              Add note
            </button>
          </div>

          <ul className="space-y-2">
            {(events.data ?? []).map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-slate-200 p-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {formatDate(e.createdAt as unknown as Date)}
                </div>
                <div className="whitespace-pre-wrap">{e.description}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
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
    role?: object;
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
          {l.role && (
            <span className="mr-auto ml-2 rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:text-slate-300">
              {l.role.name}
            </span>
          )}
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
