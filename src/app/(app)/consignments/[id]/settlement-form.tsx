"use client";

import { useActionState } from "react";
import { recordSettlement } from "../actions";
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

export function SettlementForm({ consignmentId, defaultCurrency }: { consignmentId: string; defaultCurrency: string }) {
  const action = recordSettlement.bind(null, consignmentId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Monto liquidado</Label>
        <Input id="amount" name="amount" type="number" step="0.01" required className="w-32" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="currency">Moneda</Label>
        <Select name="currency" defaultValue={defaultCurrency}>
          <SelectTrigger id="currency" className="w-28">
            <SelectValue>{(v: string) => v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="ARS">ARS</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Input id="notes" name="notes" placeholder="ej. transferencia, efectivo..." />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Registrar liquidacion"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
