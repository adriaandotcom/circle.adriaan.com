"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
        <Button
          variant="link"
          className="p-0 h-auto text-left"
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
        </Button>
        <Button
          variant="secondary"
          className="ml-auto"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Comment
        </Button>
        <Button
          variant="secondary"
          className="ml-2"
          onClick={async () => {
            if (confirm("Are you sure you want to delete this node?")) {
              await deleteNode.mutateAsync({ id: node.id });
            }
          }}
        >
          Delete
        </Button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2">
            <Textarea
              className="min-h-[60px] w-full"
              placeholder="Add a note, place, or link..."
              id={`event-${node.id}`}
            />
            <Button
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
            </Button>
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
