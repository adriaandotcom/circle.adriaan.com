"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { PaperAirplaneIcon, TrashIcon } from "@heroicons/react/24/solid";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
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
  const [files, setFiles] = useState<File[]>([]);
  const addEvent = api.event.create.useMutation({
    onSuccess: async () => {
      await utils.event.invalidate();
    },
  });
  const uploadMedia = api.event.uploadMedia.useMutation({
    onSuccess: async () => {
      await utils.event.invalidate();
    },
  });
  const deleteEvent = api.event.delete.useMutation({
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

  // Convert clean mentions @[name] to storage format @[name](id)
  const convertToStorageFormat = (cleanText: string): string => {
    return cleanText.replace(/@\[([^\]]+)\]/g, (match, label) => {
      const node = nodeOptions.find((n) => n.label === label);
      return node ? `@[${label}](${node.id})` : match;
    });
  };

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
            @{mentionLabel}
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
          <div className="relative">
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
                onPaste={async (e) => {
                  const items = e.clipboardData?.items;
                  if (!items || items.length === 0) return;
                  const blobs: File[] = [];
                  for (const it of items) {
                    if (it.kind === "file" && it.type.startsWith("image/")) {
                      const file = it.getAsFile();
                      if (file) blobs.push(file);
                    }
                  }
                  if (blobs.length) {
                    e.preventDefault();
                    setFiles((prev) => [...prev, ...blobs]);
                  }
                }}
                onKeyDown={async (e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    const cleanDescription = text.trim();
                    if (!cleanDescription && files.length === 0) return;
                    const storageDescription =
                      convertToStorageFormat(cleanDescription);
                    const created = await addEvent.mutateAsync({
                      nodeId: node.id,
                      description: storageDescription || "",
                    });
                    try {
                      if (files.length) {
                        const toBase64 = async (f: File): Promise<string> =>
                          await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = String(reader.result ?? "");
                              const idx = result.indexOf(",");
                              resolve(
                                idx >= 0 ? result.slice(idx + 1) : result
                              );
                            };
                            reader.onerror = () => reject(reader.error);
                            reader.readAsDataURL(f);
                          });

                        const payload = await Promise.all(
                          files.map(async (f) => ({
                            mimeType: f.type || "application/octet-stream",
                            base64: await toBase64(f),
                            filename: f.name,
                          }))
                        );
                        await uploadMedia.mutateAsync({
                          eventId: created.id,
                          files: payload,
                        });
                      }
                    } finally {
                      setFiles([]);
                      setText("");
                      await events.refetch();
                    }
                    return;
                  }
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
                        `$1@[${mLabel}]`
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
                          `$1@[${opt.label}]`
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
          </div>
          <FileUpload
            accept="image/*"
            multiple
            files={files}
            onChange={(f) => setFiles(f)}
            rightSlot={
              <button
                type="button"
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300"
                onClick={async () => {
                  const cleanDescription = text.trim();
                  if (!cleanDescription && files.length === 0) return;
                  const storageDescription =
                    convertToStorageFormat(cleanDescription);
                  const created = await addEvent.mutateAsync({
                    nodeId: node.id,
                    description: storageDescription || "",
                  });
                  try {
                    if (files.length) {
                      const toBase64 = async (f: File): Promise<string> =>
                        await new Promise((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = String(reader.result ?? "");
                            const idx = result.indexOf(",");
                            resolve(idx >= 0 ? result.slice(idx + 1) : result);
                          };
                          reader.onerror = () => reject(reader.error);
                          reader.readAsDataURL(f);
                        });

                      const payload = await Promise.all(
                        files.map(async (f) => ({
                          mimeType: f.type || "application/octet-stream",
                          base64: await toBase64(f),
                          filename: f.name,
                        }))
                      );
                      await uploadMedia.mutateAsync({
                        eventId: created.id,
                        files: payload,
                      });
                    }
                  } finally {
                    setFiles([]);
                    setText("");
                    await events.refetch();
                  }
                }}
              >
                <span>Save</span>
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            }
          />

          <ul className="space-y-2">
            {(events.data ?? []).map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-slate-200 p-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <span>{formatDate(e.createdAt as unknown as Date)}</span>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-red-500"
                    title="Delete event"
                    onClick={async () => {
                      if (!confirm("Delete this event and its media?")) return;
                      await deleteEvent.mutateAsync({
                        id: e.id as unknown as string,
                      });
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="whitespace-pre-wrap">
                  {linkify(e.description as unknown as string)}
                </div>
                <EventMediaList eventId={e.id as unknown as string} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function EventMediaList({ eventId }: { eventId: string }) {
  const mediaQuery = api.event.mediaForEvent.useQuery({ eventId });
  const items = (mediaQuery.data ?? []) as Array<{
    id: string;
    mimeType: string;
    byteSize: number;
    imageWidth?: number | null;
    imageHeight?: number | null;
  }>;
  if (!items.length) return null;
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {items.map((m) => (
        <div
          key={m.id}
          className="relative aspect-square overflow-hidden rounded border border-slate-200 dark:border-slate-700"
        >
          {m.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${m.id}`}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <a
              href={`/api/media/${m.id}`}
              target="_blank"
              rel="noreferrer"
              className="block p-2 text-xs underline"
            >
              {m.mimeType}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
