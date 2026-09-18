"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { deleteCatalogEntry } from "./actions";

export function DeleteCatalogButton({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCatalogEntry(entryId);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Eliminado del catalogo");
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
            aria-label="Eliminar del catalogo"
          />
        }
      >
        <Trash2 className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">¿Eliminar este modelo del catalogo?</p>
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
