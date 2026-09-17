"use client";

import { useActionState, useState } from "react";
import { createExpense } from "../actions";
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

type Category = { id: string; name: string };
type CashAccount = { id: string; name: string; currency: string };

export function ExpenseForm({
  categories,
  cashAccounts,
}: {
  categories: Category[];
  cashAccounts: CashAccount[];
}) {
  const [state, formAction, pending] = useActionState(createExpense, undefined);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "new");

  const categoryLabels: Record<string, string> = {
    new: "+ Crear categoria nueva",
    ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
  };
  const accountLabels = Object.fromEntries(cashAccounts.map((a) => [a.id, `${a.name} (${a.currency})`]));

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Categoria</Label>
            <Select name="categoryId" value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
              <SelectTrigger>
                <SelectValue>{(v: string) => categoryLabels[v] ?? "Categoria"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Crear categoria nueva</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {categoryId === "new" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="newCategoryName">Nombre de la categoria</Label>
              <Input id="newCategoryName" name="newCategoryName" placeholder="ej. Alquiler" required />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select name="currency" defaultValue="ARS">
                <SelectTrigger id="currency">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cashAccountId">Cuenta de origen</Label>
            <Select name="cashAccountId" defaultValue={cashAccounts[0]?.id}>
              <SelectTrigger id="cashAccountId">
                <SelectValue>{(v: string) => accountLabels[v] ?? "Cuenta"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cashAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descripcion</Label>
            <Input id="description" name="description" placeholder="ej. Alquiler septiembre" />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Registrar gasto"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
