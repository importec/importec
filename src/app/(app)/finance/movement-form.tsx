"use client";

import { useActionState } from "react";
import { createManualMovement } from "./actions";
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

export function MovementForm({ cashAccounts }: { cashAccounts: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createManualMovement, undefined);
  const accountLabels = Object.fromEntries(cashAccounts.map((a) => [a.id, a.name]));

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="cashAccountId">Cuenta</Label>
        <Select name="cashAccountId" defaultValue={cashAccounts[0]?.id}>
          <SelectTrigger id="cashAccountId" className="w-40">
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Tipo</Label>
        <Select name="type" defaultValue="OUT">
          <SelectTrigger id="type" className="w-32">
            <SelectValue>{(v: string) => (v === "OUT" ? "Retiro" : "Ingreso")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OUT">Retiro</SelectItem>
            <SelectItem value="IN">Ingreso</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Monto</Label>
        <Input id="amount" name="amount" type="number" step="0.01" required className="w-28" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="description">Descripcion</Label>
        <Input id="description" name="description" placeholder="ej. Retiro para gastos personales" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Registrar movimiento"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
