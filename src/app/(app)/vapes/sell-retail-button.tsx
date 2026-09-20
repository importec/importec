"use client";

import { useActionState, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sellVapeRetail } from "./actions";

type CashAccount = { id: string; name: string };

export function SellRetailButton({
  productId,
  maxQuantity,
  defaultPrice,
  cashAccounts,
}: {
  productId: string;
  maxQuantity: number;
  defaultPrice: number;
  cashAccounts: CashAccount[];
}) {
  const [open, setOpen] = useState(false);
  const action = sellVapeRetail.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const accountLabels = Object.fromEntries(cashAccounts.map((a) => [a.id, a.name]));

  if (maxQuantity <= 0) return null;

  if (cashAccounts.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin cuenta en esa moneda</p>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <ShoppingCart className="size-4" />
        Vender
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <form action={formAction} className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground">Cantidad</Label>
          <Input name="quantity" type="number" min={1} max={maxQuantity} defaultValue={1} required />
          <Label className="text-xs font-medium text-muted-foreground">Precio de venta</Label>
          <Input name="price" type="number" step="0.01" min={0} defaultValue={defaultPrice} required />
          <Label className="text-xs font-medium text-muted-foreground">Ingresa a la cuenta</Label>
          <Select name="cashAccountId" defaultValue={cashAccounts[0]?.id}>
            <SelectTrigger>
              <SelectValue>{(v: string) => accountLabels[v] ?? "Cuenta"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cashAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando..." : "Confirmar venta"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
