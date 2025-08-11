"use client";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import SvgGraph, { type SvgNode, type SvgLink } from "@/components/SvgGraph";
import CreateLinkForm from "@/components/CreateLinkForm";
import NodeGrid from "@/components/NodeGrid";
import AddNodeModal from "@/components/AddNodeModal";
import { type NodeType } from "@/lib/schemas";
import NodeRow from "@/components/NodeRow";
import { Button } from "@/components/ui/button";

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

  const [addOpen, setAddOpen] = useState(false);
  const nodeItems = (nodes.data ?? []) as Array<{
    id: string;
    label: string;
    type: NodeType | null | undefined;
    color?: string | null;
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

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            All members
          </h1>
          <Button onClick={() => setAddOpen(true)}>Add</Button>
        </div>
        <NodeGrid
          nodes={nodeItems.map((n) => ({
            id: n.id,
            label: n.label,
            type: n.type,
            color: (n as any).color ?? null,
          }))}
          onSelect={(id) => setSelectedNodeId(id)}
        />
      </section>

      <AddNodeModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={async (newLabel, newType, color) => {
          await createNode.mutateAsync({
            label: newLabel,
            type: newType,
            color,
          });
        }}
        isCreating={createNode.isPending}
      />

      <section className="space-y-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Items
        </h1>
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
            selectedId={selectedNodeId}
          />
        </div>
        {selectedNodeId ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Showing direct connections for{" "}
            <code>{nodeItems.find((n) => n.id === selectedNodeId)?.label}</code>{" "}
            ·
            <Button
              variant="link"
              className="ml-2 p-0 h-auto"
              onClick={() => setSelectedNodeId(null)}
            >
              Clear
            </Button>
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
          <Button
            variant="secondary"
            onClick={async () => {
              if (confirm("Are you sure you want to delete this link?")) {
                await del.mutateAsync({ id: l.id });
              }
            }}
          >
            Delete
          </Button>
        </li>
      ))}
    </ul>
  );
}
