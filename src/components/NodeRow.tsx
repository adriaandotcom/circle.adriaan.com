"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

type NodeType = "company" | "person" | "group" | "location";

export default function NodeRow({
  node,
  onSelect,
}: {
  node: { id: string; label: string; type?: NodeType | null };
  onSelect?: (id: string) => void;
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

  const linkify = (text?: string) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g);
    return parts.map((part, idx) => {
      const isUrl = /^(https?:\/\/|www\.)/.test(part);
      if (!isUrl) return <span key={idx}>{part}</span>;
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          {part}
        </a>
      );
    });
  };

  return (
    <li className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <button
          className="text-left"
          onClick={() => {
            setOpen((v) => !v);
            onSelect?.(node.id);
          }}
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
                <div className="whitespace-pre-wrap">
                  {linkify(e.description as unknown as string)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
