"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markConsignmentReturned } from "../actions";

export function ReturnButton({ consignmentId }: { consignmentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await markConsignmentReturned(consignmentId);
          if (result?.error) toast.error(result.error);
          else toast.success("Equipo marcado como devuelto al consignante");
        });
      }}
    >
      Marcar como devuelto
    </Button>
  );
}
