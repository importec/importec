"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatUsd } from "@/lib/format";

export function EditableNumber({
  value,
  onSave,
  className,
  emptyLabel = "—",
}: {
  value: number | null;
  onSave: (value: number) => Promise<{ error?: string } | undefined>;
  className?: string;
  emptyLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    const parsed = Number(draft);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Ingresa un numero valido");
      return;
    }
    if (parsed === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await onSave(parsed);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Precio actualizado");
        router.refresh();
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        autoFocus
        disabled={isPending}
        defaultValue={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            setDraft(value?.toString() ?? "");
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-24 rounded border border-input bg-background px-1.5 py-0.5 text-right text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDraft(value?.toString() ?? "");
        setEditing(true);
      }}
      className={`rounded px-1 py-0.5 text-right hover:bg-accent hover:underline ${className ?? ""}`}
    >
      {value != null ? formatUsd(value) : emptyLabel}
    </button>
  );
}
