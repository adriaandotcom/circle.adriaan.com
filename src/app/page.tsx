"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/trpc/react";
import SvgGraph, { type SvgNode, type SvgLink } from "@/components/SvgGraph";
import CreateLinkForm from "@/components/CreateLinkForm";
import NodeRow from "@/components/NodeRow";

export default function Home() {
  const utils = api.useUtils();
  const nodes = api.node.list.useQuery();
  const linksQuery = api.link.list.useQuery();
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
  type NodeType = "company" | "person" | "group" | "location";
  const [type, setType] = useState<"" | NodeType>("person");
  const nodeItems = (nodes.data ?? []) as Array<{
    id: string;
    label: string;
    type: ("company" | "person" | "group" | "location") | null | undefined;
  }>;
  // events handled within NodeRow

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const allLinks: SvgLink[] = (linksQuery.data ?? []).map((l: any) => ({
    id: l.id,
    source: l.nodeA?.id ?? l.nodeAId,
    target: l.nodeB?.id ?? l.nodeBId,
  }));

  const graphNodes: SvgNode[] = (() => {
    if (!selectedNodeId)
      return nodeItems.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type ?? undefined,
      }));
    const neighborIds = new Set<string>([selectedNodeId]);
    allLinks.forEach((l) => {
      if (l.source === selectedNodeId) neighborIds.add(l.target);
      if (l.target === selectedNodeId) neighborIds.add(l.source);
    });
    return nodeItems
      .filter((n) => neighborIds.has(n.id))
      .map((n) => ({ id: n.id, label: n.label, type: n.type ?? undefined }));
  })();

  const graphLinks: SvgLink[] = (() => {
    if (!selectedNodeId) return allLinks;
    // include links that connect the selected node OR connect any two neighbors of the selected node
    const neighborIds = new Set<string>([selectedNodeId]);
    allLinks.forEach((l) => {
      if (l.source === selectedNodeId) neighborIds.add(l.target);
      if (l.target === selectedNodeId) neighborIds.add(l.source);
    });
    return allLinks.filter(
      (l) => neighborIds.has(l.source) && neighborIds.has(l.target)
    );
  })();

  // role options now handled inside CreateLinkForm when/if needed

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
              const nodeType: Exclude<NodeType, ""> = (
                type === "" ? "person" : type
              ) as Exclude<NodeType, "">;
              await createNode.mutateAsync({ label, type: nodeType });
              setLabel("");
            }}
          >
            Add item
          </button>
        </div>
        <ul className="space-y-2 pl-0 text-slate-700 dark:text-slate-300">
          {nodeItems.map((n) => (
            <NodeRow
              key={n.id}
              node={n}
              onSelect={(id) => setSelectedNodeId(id)}
            />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
          Graph
        </h2>
        <div className="w-full aspect-square rounded-md border border-slate-200 p-2 dark:border-slate-700">
          <SvgGraph
            nodes={graphNodes}
            links={graphLinks}
            onSelect={(id) => setSelectedNodeId(id)}
            dark={isDark}
          />
        </div>
        {selectedNodeId ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Showing direct connections for{" "}
            <code>{nodeItems.find((n) => n.id === selectedNodeId)?.label}</code>{" "}
            ·
            <button
              className="ml-2 underline"
              onClick={() => setSelectedNodeId(null)}
            >
              Clear
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
          Create link
        </h2>
        <CreateLinkForm
          nodes={nodeItems.map((n) => ({ id: n.id, label: n.label }))}
          onCreate={async (na, nb, role) => {
            await createLink.mutateAsync({ role, nodeIds: [na, nb] });
          }}
        />
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

// NodeRow moved to components
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
    roles?: Array<{ id: string; name: string }>;
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
          <span className="flex items-center gap-2">
            {l.nodeA.label} ↔ {l.nodeB.label}
            {l.roles && l.roles.length > 0 && (
              <span className="mr-auto ml-2 flex flex-wrap gap-1">
                {l.roles.map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:text-slate-300"
                  >
                    {r.name}
                  </span>
                ))}
              </span>
            )}
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
