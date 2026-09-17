"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { returnStockFromSeller } from "../../actions";

export function ReturnButton({
  sellerId,
  productId,
  maxQuantity,
}: {
  sellerId: string;
  productId: string;
  maxQuantity: number;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(maxQuantity);
  const [isPending, startTransition] = useTransition();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          />
        }
      >
        <Undo2 className="size-3.5" />
        Devolver
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="end">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Cantidad a devolver</label>
          <Input
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await returnStockFromSeller(sellerId, productId, quantity);
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Devolucion registrada");
                  setOpen(false);
                }
              });
            }}
          >
            {isPending ? "Guardando..." : "Confirmar devolucion"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
