"use client";

import { useActionState } from "react";
import { createCashAccount } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KIND_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  BANK: "Banco",
  WALLET: "Billetera virtual",
  OTHER: "Otro",
};

export function NewAccountForm() {
  const [state, formAction, pending] = useActionState(createCashAccount, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" placeholder="ej. Lemon Cash (ARS)" required className="w-48" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="currency">Moneda</Label>
        <Select name="currency" defaultValue="ARS">
          <SelectTrigger id="currency" className="w-28">
            <SelectValue>{(v: string) => v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ARS">ARS</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="kind">Tipo</Label>
        <Select name="kind" defaultValue="WALLET">
          <SelectTrigger id="kind" className="w-40">
            <SelectValue>{(v: string) => KIND_LABELS[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando..." : "Crear cuenta"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
