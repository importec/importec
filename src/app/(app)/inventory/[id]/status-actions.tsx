"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { changeInventoryUnitStatus } from "../actions";
import { STATUS_LABELS } from "@/lib/format";
import type { InventoryUnitStatus } from "@/generated/prisma/enums";

export function StatusActions({
  unitId,
  options,
}: {
  unitId: string;
  options: InventoryUnitStatus[];
}) {
  const [isPending, startTransition] = useTransition();

  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((status) => (
        <Button
          key={status}
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await changeInventoryUnitStatus(unitId, status);
              if (result?.error) {
                toast.error(result.error);
              } else {
                toast.success(`Estado actualizado a ${STATUS_LABELS[status]}`);
              }
            });
          }}
        >
          Marcar como {STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}
