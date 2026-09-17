"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { changeRepairStatus } from "../actions";
import { REPAIR_STATUS_LABELS } from "@/lib/repairs/status";
import type { RepairStatus } from "@/generated/prisma/enums";

export function StatusActions({ repairId, options }: { repairId: string; options: RepairStatus[] }) {
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
              const result = await changeRepairStatus(repairId, status);
              if (result?.error) toast.error(result.error);
              else toast.success(`Estado actualizado a ${REPAIR_STATUS_LABELS[status]}`);
            });
          }}
        >
          Marcar como {REPAIR_STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}
