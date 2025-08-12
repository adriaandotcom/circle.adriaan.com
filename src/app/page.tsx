"use client";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import SvgGraph, { type SvgNode, type SvgLink } from "@/components/SvgGraph";
import CreateLinkForm from "@/components/CreateLinkForm";
import NodeGrid from "@/components/NodeGrid";
import AddNodeModal from "@/components/AddNodeModal";
import { type NodeType } from "@/lib/schemas";
import NodeRow from "@/components/NodeRow";
import NodeAutocomplete from "@/components/NodeAutocomplete";
import { Button } from "@/components/ui/button";
import { fetchTwitterProfile } from "@/lib/twitter";

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
    colorHexLight?: string | null;
    colorHexDark?: string | null;
    imageMediaId?: string | null;
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
        imageMediaId: (n as any).imageMediaId ?? undefined,
      }));
    const neighborIds = new Set<string>([selectedNodeId]);
    allLinks.forEach((l) => {
      if (l.source === selectedNodeId) neighborIds.add(l.target);
      if (l.target === selectedNodeId) neighborIds.add(l.source);
    });
    return nodeItems
      .filter((n) => neighborIds.has(n.id))
      .map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type ?? undefined,
        imageMediaId: (n as any).imageMediaId ?? undefined,
      }));
  })();

  console.log(typeof fetchTwitterProfile);

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
            colorHexLight: (n as any).colorHexLight ?? null,
            colorHexDark: (n as any).colorHexDark ?? null,
            imageMediaId: (n as any).imageMediaId ?? null,
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

      {selectedNodeId ? (
        <NodeDetailModal
          node={nodeItems.find((n) => n.id === selectedNodeId)!}
          open={!!selectedNodeId}
          onOpenChange={(o) => !o && setSelectedNodeId(null)}
        />
      ) : null}

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

function NodeDetailModal({
  node,
  open,
  onOpenChange,
}: {
  node: { id: string; label: string; type: NodeType | null | undefined };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) return null;
  const [tab, setTab] = useState<"events" | "links" | "settings">("events");
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 min-h-full"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 max-h-[90vh] overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {node.label}
          </h3>
          <button
            className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2 text-sm dark:border-slate-700">
          {[
            { k: "events", label: "Events" },
            { k: "links", label: "Links" },
            { k: "settings", label: "Settings" },
          ].map((t) => (
            <button
              key={t.k}
              className={`rounded px-3 py-1 ${
                tab === (t.k as any)
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
              onClick={() => setTab(t.k as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "events" ? (
          <ul className="space-y-2 pl-0 text-slate-700 dark:text-slate-300">
            <NodeRow node={node as any} forceOpen hideHeader />
          </ul>
        ) : null}

        {tab === "links" ? <LinksTab nodeId={node.id} /> : null}
        {tab === "settings" ? (
          <SettingsTab nodeId={node.id} onClose={() => onOpenChange(false)} />
        ) : null}
      </div>
    </div>
  );
}

function LinksTab({ nodeId }: { nodeId: string }) {
  const utils = api.useUtils();
  const nodes = api.node.list.useQuery();
  const links = api.link.forNode.useQuery({ nodeId });
  const allRoles = api.link.roles.useQuery();
  const create = api.link.create.useMutation({
    onSuccess: async () => {
      await utils.link.forNode.invalidate({ nodeId });
      await utils.link.list.invalidate();
    },
  });
  const del = api.link.delete.useMutation({
    onSuccess: async () => {
      await utils.link.forNode.invalidate({ nodeId });
      await utils.link.list.invalidate();
    },
  });
  const [otherId, setOtherId] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const options = ((nodes.data ?? []) as Array<{ id: string; label: string }>)
    .filter((n) => n.id !== nodeId)
    .map((n) => ({ id: n.id, label: n.label }));
  const existing = (links.data ?? []) as Array<{
    id: string;
    nodeAId: string;
    nodeBId: string;
    nodeA?: { id: string; label: string };
    nodeB?: { id: string; label: string };
    roles?: Array<{ id: string; name: string }>;
  }>;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="w-full">
          <NodeAutocomplete
            options={options}
            value={otherId}
            onChange={(id) => setOtherId(id)}
            placeholder="Select member…"
          />
        </div>
        <div className="w-40">
          <NodeAutocomplete
            options={(
              (allRoles.data ?? []) as Array<{ id: string; name: string }>
            ).map((r) => ({ id: r.name, label: r.name }))}
            value={role}
            onChange={(v) => setRole(v)}
            placeholder="Role (optional)"
            freeText
          />
        </div>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 whitespace-nowrap"
          disabled={!otherId}
          onClick={async () => {
            const a = [nodeId, otherId] as [string, string];
            await create.mutateAsync({ nodeIds: a, role: role || undefined });
            setOtherId("");
            setRole("");
          }}
        >
          Add link
        </button>
      </div>

      <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
        {existing.map((l) => (
          <li
            key={l.id}
            className="flex items-center justify-between rounded border border-slate-200 p-2 dark:border-slate-700"
          >
            <span>
              {l.nodeAId === nodeId
                ? `${l.nodeA?.label ?? l.nodeAId} → ${
                    l.nodeB?.label ?? l.nodeBId
                  }`
                : `${l.nodeB?.label ?? l.nodeBId} ← ${
                    l.nodeA?.label ?? l.nodeAId
                  }`}
              {l.roles && l.roles.length > 0 ? (
                <span className="ml-2 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300">
                  {l.roles.map((r) => r.name).join(", ")}
                </span>
              ) : null}
            </span>
            <button
              className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={async () => {
                if (!confirm("Delete this link?")) return;
                await del.mutateAsync({ id: l.id });
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsTab({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const del = api.node.delete.useMutation({
    onSuccess: async () => {
      await utils.node.list.invalidate();
      await utils.link.invalidate();
      onClose();
    },
  });
  return (
    <div className="space-y-4">
      <button
        className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
        onClick={async () => {
          if (!confirm("Delete this node? This cannot be undone.")) return;
          await del.mutateAsync({ id: nodeId });
        }}
      >
        Delete node
      </button>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Archive coming soon
      </div>
    </div>
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
