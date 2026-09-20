"use client";

import { useActionState, useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { recordSellerSale } from "../../actions";

type CashAccount = { id: string; name: string };

export function SoldButton({
  sellerId,
  productId,
  maxQuantity,
  unitPrice,
  currency,
  cashAccounts,
}: {
  sellerId: string;
  productId: string;
  maxQuantity: number;
  unitPrice: number;
  currency: "USD" | "ARS";
  cashAccounts: CashAccount[];
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(maxQuantity);
  const action = recordSellerSale.bind(null, sellerId, productId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const accountLabels = Object.fromEntries(cashAccounts.map((a) => [a.id, a.name]));

  if (cashAccounts.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin cuenta en {currency}</p>;
  }

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
        <CircleDollarSign className="size-3.5" />
        Vendieron
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <form action={formAction} className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Cantidad vendida</label>
          <Input
            name="quantity"
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <label className="text-xs font-medium text-muted-foreground">Ingresa a la cuenta</label>
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
          <p className="text-xs text-muted-foreground">
            Ingresa {formatCurrency(unitPrice * (quantity || 0), currency)} ({formatCurrency(unitPrice, currency)} c/u)
          </p>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando..." : "Confirmar venta"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
