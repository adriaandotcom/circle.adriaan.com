"use client";

import React, { useRef, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";

export type FileUploadProps = {
  accept?: string;
  multiple?: boolean;
  onChange?: (files: File[]) => void;
  rightSlot?: React.ReactNode;
  files?: File[];
};

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = "*/*",
  multiple = false,
  onChange,
  rightSlot,
  files: filesProp,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const files = filesProp ?? internalFiles;

  const openPicker = () => inputRef.current?.click();
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const selected = Array.from(e.target.files ?? []);
    setInternalFiles(selected);
    onChange?.(selected);
  };

  const removeAt = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setInternalFiles(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          onClick={openPicker}
          aria-label="Add photos"
          className="text-slate-500 hover:text-slate-300"
        >
          <PhotoIcon className="h-5 w-5" />
        </button>
        <div className="ml-4 flex items-center">{rightSlot}</div>
      </div>
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {files.map((f, idx) => (
            <div
              key={`${f.name}-${f.size}-${f.lastModified}`}
              className="relative rounded-full border px-3 py-1.5 text-xs border-slate-200 dark:border-slate-700"
            >
              <button
                type="button"
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-700 text-white leading-4 text-[10px]"
                aria-label={`Remove ${f.name}`}
                onClick={() => removeAt(idx)}
              >
                ×
              </button>
              <span
                className="truncate max-w-[160px] inline-block align-middle"
                title={f.name}
              >
                {f.name.length > 18 ? `${f.name.slice(0, 15)}…` : f.name}
              </span>
              <span className="ml-2 text-slate-500">
                {(f.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
