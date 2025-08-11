"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type NodeType } from "@/lib/schemas";

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

  const nodesQuery = api.node.list.useQuery();
  const nodeOptions = useMemo(
    () =>
      ((nodesQuery.data ?? []) as Array<{ id: string; label: string }>).map(
        (n) => ({ id: n.id, label: n.label })
      ),
    [nodesQuery.data]
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const caretPos = () => textareaRef.current?.selectionStart ?? text.length;
  const prefixUntilCaret = () => text.slice(0, caretPos());

  const mentionQuery = useMemo(() => {
    const prefix = prefixUntilCaret();
    const match = prefix.match(/(^|\s)@([^@\n\r\t\f]*)$/);
    return match ? match[2] : null;
  }, [text]);

  const mentionResults = useMemo(() => {
    if (!mentionQuery) return [] as Array<{ id: string; label: string }>;
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return [] as Array<{ id: string; label: string }>;
    return nodeOptions
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [mentionQuery, nodeOptions]);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-NL", {
      year: "numeric",
      month: "long",
      weekday: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(new Date(date));

  const linkify = (value?: string) => {
    if (!value) return null;
    const nodes: ReactNode[] = [];
    const regex =
      /(https?:\/\/[^\s]+|www\.[^\s]+)|@\[([^\]]+)\]\(([A-Za-z0-9_-]+)\)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value))) {
      if (match.index > lastIndex)
        nodes.push(value.slice(lastIndex, match.index));
      const [full, url, mentionLabel, mentionId] = match;
      if (url) {
        const href = url.startsWith("http") ? url : `https://${url}`;
        nodes.push(
          <a
            key={`${href}-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            {url}
          </a>
        );
      } else if (mentionId) {
        nodes.push(
          <a
            key={`${mentionId}-${match.index}`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onSelect?.(mentionId);
            }}
            className="underline text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            {mentionLabel}
          </a>
        );
      } else nodes.push(full);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < value.length) nodes.push(value.slice(lastIndex));
    return nodes;
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
            <div className="relative w-full">
              <Textarea
                ref={textareaRef}
                className="min-h-[60px] w-full"
                placeholder="Add a note, place, link, or @mention..."
                id={`event-${node.id}`}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setActiveIdx(0);
                }}
                onKeyDown={(e) => {
                  if (!mentionResults.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) =>
                      Math.min(i + 1, mentionResults.length - 1)
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    if (mentionResults[activeIdx]) {
                      e.preventDefault();
                      const { id: mId, label: mLabel } =
                        mentionResults[activeIdx];
                      const prefix = prefixUntilCaret();
                      const suffix = text.slice(caretPos());
                      const replacedPrefix = prefix.replace(
                        /(^|\s)@([^@\n\r\t\f]*)$/,
                        `$1@[${mLabel}](${mId})`
                      );
                      const next = `${replacedPrefix}${suffix}`;
                      setText(next);
                      setTimeout(() => textareaRef.current?.focus());
                    }
                  }
                }}
              />
              {mentionResults.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {mentionResults.map((opt, idx) => (
                    <li
                      key={opt.id}
                      className={`cursor-pointer rounded px-2 py-1 text-sm ${
                        idx === activeIdx
                          ? "bg-slate-100 dark:bg-slate-700"
                          : ""
                      }`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const prefix = prefixUntilCaret();
                        const suffix = text.slice(caretPos());
                        const replacedPrefix = prefix.replace(
                          /(^|\s)@([^@\n\r\t\f]*)$/,
                          `$1@[${opt.label}](${opt.id})`
                        );
                        const next = `${replacedPrefix}${suffix}`;
                        setText(next);
                        setTimeout(() => textareaRef.current?.focus());
                      }}
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              onClick={async () => {
                const description = text.trim();
                if (!description) return;
                await addEvent.mutateAsync({ nodeId: node.id, description });
                setText("");
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
