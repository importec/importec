"use client";

import { useActionState, useState } from "react";
import { Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { removeCentralStock } from "./actions";

export function RemoveStockButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const action = removeCentralStock.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md hover:bg-accent"
            aria-label="Quitar stock"
          />
        }
      >
        <Minus className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <form action={formAction} className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Quitar del stock propio</label>
          <Input name="quantity" type="number" min={1} placeholder="Cantidad" autoFocus required />
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" variant="destructive" disabled={pending}>
            {pending ? "Guardando..." : "Quitar"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
