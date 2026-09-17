"use client";

import { useActionState } from "react";
import { payPurchase } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PayForm({
  purchaseId,
  suggestedAmount,
  cashAccounts,
}: {
  purchaseId: string;
  suggestedAmount: number;
  cashAccounts: { id: string; name: string }[];
}) {
  const action = payPurchase.bind(null, purchaseId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const accountLabels = Object.fromEntries(cashAccounts.map((a) => [a.id, a.name]));

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Monto pagado</Label>
        <Input id="amount" name="amount" type="number" step="0.01" defaultValue={suggestedAmount} required className="w-32" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cashAccountId">Cuenta de origen</Label>
        <Select name="cashAccountId" defaultValue={cashAccounts[0]?.id}>
          <SelectTrigger id="cashAccountId" className="w-48">
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
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Registrar pago"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
