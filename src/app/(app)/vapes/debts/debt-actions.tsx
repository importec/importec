"use client";

import { useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markVapeDebtPaid, deleteVapeDebt } from "../actions";

export function DebtActions({ debtId, paid }: { debtId: string; paid: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markVapeDebtPaid(debtId);
      if (result?.error) toast.error(result.error);
      else toast.success("Marcado como pagado");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVapeDebt(debtId);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Deuda eliminada");
        setOpen(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      {!paid && (
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleMarkPaid}>
          <Check className="size-4" />
          Marcar pagado
        </Button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
              aria-label="Eliminar deuda"
            />
          }
        >
          <Trash2 className="size-4" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">¿Eliminar esta deuda?</p>
            <p className="text-xs text-muted-foreground">
              Si estaba vinculada a un producto, el stock que se descontó se devuelve.
            </p>
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
    </div>
  );
}
