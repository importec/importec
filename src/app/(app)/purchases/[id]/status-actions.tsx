"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { changePurchaseStatus } from "../actions";
import { PURCHASE_STATUS_LABELS } from "@/lib/purchases/status";
import type { PurchaseStatus } from "@/generated/prisma/enums";

export function StatusActions({ purchaseId, options }: { purchaseId: string; options: PurchaseStatus[] }) {
  const [isPending, startTransition] = useTransition();
  const changeable = options.filter((status) => status !== "PAID");

  if (changeable.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {changeable.map((status) => (
        <Button
          key={status}
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await changePurchaseStatus(purchaseId, status);
              if (result?.error) toast.error(result.error);
              else toast.success(`Estado actualizado a ${PURCHASE_STATUS_LABELS[status]}`);
            });
          }}
        >
          Marcar como {PURCHASE_STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}
