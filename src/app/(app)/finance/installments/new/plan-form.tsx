"use client";

import { useActionState, useState } from "react";
import { createInstallmentPlan } from "../../actions";
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
import { Card, CardContent } from "@/components/ui/card";
import { CustomerPicker, type PickedCustomer } from "@/components/customers/customer-picker";

const CURRENCY_LABELS: Record<string, string> = { ARS: "Pesos (ARS)", USD: "Dolares (USD)" };

function todayIso() {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now.toISOString().slice(0, 10);
}

export function PlanForm() {
  const [state, formAction, pending] = useActionState(createInstallmentPlan, undefined);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [currency, setCurrency] = useState<"USD" | "ARS">("ARS");

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="customerId" value={customer?.id ?? ""} />

          <div className="flex flex-col gap-2">
            <Label>Cliente</Label>
            <CustomerPicker value={customer} onChange={setCustomer} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="totalAmount">Monto total</Label>
              <Input id="totalAmount" name="totalAmount" type="number" step="0.01" min={0} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select name="currency" value={currency} onValueChange={(v) => v && setCurrency(v as "USD" | "ARS")}>
                <SelectTrigger id="currency">
                  <SelectValue>{(v: string) => CURRENCY_LABELS[v] ?? "Moneda"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                  <SelectItem value="USD">Dolares (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="installmentsCount">Cantidad de cuotas</Label>
              <Input
                id="installmentsCount"
                name="installmentsCount"
                type="number"
                min={2}
                max={60}
                defaultValue={3}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstDueDate">Primer vencimiento</Label>
              <Input id="firstDueDate" name="firstDueDate" type="date" defaultValue={todayIso()} required />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descripcion (opcional)</Label>
            <Input id="description" name="description" placeholder="ej. iPhone 13 128GB" />
          </div>

          <p className="text-xs text-muted-foreground">
            Las cuotas se generan en partes iguales, una por mes a partir del primer vencimiento.
          </p>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !customer}>
              {pending ? "Guardando..." : "Crear plan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
