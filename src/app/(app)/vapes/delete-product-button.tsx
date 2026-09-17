"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { deleteVapeProduct } from "./actions";

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVapeProduct(productId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Producto eliminado");
        setOpen(false);
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
            aria-label="Eliminar producto"
          />
        }
      >
        <Trash2 className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">¿Eliminar &quot;{productName}&quot;?</p>
          <p className="text-xs text-muted-foreground">
            Solo se puede eliminar si no tiene stock propio ni en manos de vendedores.
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
