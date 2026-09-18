"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { deleteInstallmentPlan } from "../../actions";

export function DeletePlanButton({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInstallmentPlan(planId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Plan eliminado");
        router.push("/finance/installments");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="destructive" size="sm" />}>
        <Trash2 className="size-4" />
        Eliminar plan
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">¿Eliminar este plan de cuotas?</p>
          <p className="text-xs text-muted-foreground">Solo se puede porque todavia no se cobro ninguna cuota.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
              {isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
