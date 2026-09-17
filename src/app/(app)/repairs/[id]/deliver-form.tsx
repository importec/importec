"use client";

import { useActionState } from "react";
import { deliverRepair } from "../actions";
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

const METHOD_LABELS: Record<string, string> = { CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", OTHER: "Otro" };

export function DeliverForm({
  repairId,
  suggestedAmount,
  cashAccounts,
}: {
  repairId: string;
  suggestedAmount: number;
  cashAccounts: { id: string; name: string }[];
}) {
  const action = deliverRepair.bind(null, repairId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const accountLabels = Object.fromEntries(cashAccounts.map((a) => [a.id, a.name]));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Monto cobrado</Label>
          <Input id="amount" name="amount" type="number" step="0.01" defaultValue={suggestedAmount || undefined} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="method">Medio de pago</Label>
          <Select name="method" defaultValue="CASH">
            <SelectTrigger id="method">
              <SelectValue>{(v: string) => METHOD_LABELS[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METHOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cashAccountId">Cuenta de destino</Label>
          <Select name="cashAccountId" defaultValue={cashAccounts[0]?.id}>
            <SelectTrigger id="cashAccountId">
              <SelectValue>{(v: string) => accountLabels[v] ?? "Cuenta de destino"}</SelectValue>
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="warrantyDays">Garantia (dias)</Label>
          <Input id="warrantyDays" name="warrantyDays" type="number" defaultValue={90} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Entregando..." : "Registrar entrega y cobro"}
        </Button>
      </div>
    </form>
  );
}
