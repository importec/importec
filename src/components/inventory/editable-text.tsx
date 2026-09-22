"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function EditableText({
  value,
  onSave,
  className,
  emptyLabel = "—",
  placeholder,
}: {
  value: string;
  onSave: (value: string) => Promise<{ error?: string } | undefined>;
  className?: string;
  emptyLabel?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await onSave(trimmed);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Actualizado");
        router.refresh();
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        disabled={isPending}
        defaultValue={draft}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full resize-none rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDraft(value);
        setEditing(true);
      }}
      className={`w-full whitespace-pre-line rounded px-2 py-1.5 text-left hover:bg-accent hover:underline ${className ?? ""}`}
    >
      {value || emptyLabel}
    </button>
  );
}
