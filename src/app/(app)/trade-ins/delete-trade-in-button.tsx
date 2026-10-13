"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { deleteTradeIn } from "./actions";

export function DeleteTradeInButton({ tradeInId }: { tradeInId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTradeIn(tradeInId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Canje y equipo eliminados");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Eliminar canje" />}
      >
        <Trash2 className="size-4 text-destructive" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">¿Eliminar este canje?</p>
          <p className="text-xs text-muted-foreground">
            Se borra el canje y el equipo recibido del stock. La venta no se modifica. Solo se puede si el
            equipo no se vendio ni esta en consignacion.
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
  );
}
