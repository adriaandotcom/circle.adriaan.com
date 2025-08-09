"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Option = { id: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  freeText?: boolean;
};

const NodeAutocomplete = ({
  options,
  value,
  onChange,
  placeholder,
  freeText,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const valueLabel = useMemo(
    () => options.find((o) => o.id === value)?.label ?? "",
    [options, value]
  );
  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 50);
    const q = query.toLowerCase();
    return options
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const commit = (opt: Option) => {
    onChange(opt.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        placeholder={placeholder}
        value={open ? query : valueLabel || (freeText ? value : "")}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (freeText) onChange(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const opt = filtered[activeIdx];
            if (opt) commit(opt);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {filtered.length === 0 ? (
            <li className="px-2 py-1 text-sm text-slate-500 dark:text-slate-400">
              No results
            </li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt.id}
                className={`cursor-pointer rounded px-2 py-1 text-sm ${
                  idx === activeIdx ? "bg-slate-100 dark:bg-slate-700" : ""
                }`}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(opt);
                }}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default NodeAutocomplete;
