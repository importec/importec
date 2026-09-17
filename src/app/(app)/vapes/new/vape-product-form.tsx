"use client";

import { useActionState } from "react";
import { createVapeProduct } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCY_LABELS: Record<string, string> = { USD: "Dolares (USD)", ARS: "Pesos (ARS)" };

export function VapeProductForm() {
  const [state, formAction, pending] = useActionState(createVapeProduct, undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" placeholder="ej. Elf Bar BC5000" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="flavor">Sabor (opcional)</Label>
            <Input id="flavor" name="flavor" placeholder="ej. Sandia hielo" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select name="currency" defaultValue="ARS">
                <SelectTrigger id="currency">
                  <SelectValue>{(value: string) => CURRENCY_LABELS[value] ?? "Moneda"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                  <SelectItem value="USD">Dolares (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stockQuantity">Stock inicial</Label>
              <Input id="stockQuantity" name="stockQuantity" type="number" min={0} defaultValue={0} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cost">Costo</Label>
              <Input id="cost" name="cost" type="number" step="0.01" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="salePrice">Precio de venta</Label>
              <Input id="salePrice" name="salePrice" type="number" step="0.01" required />
            </div>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar producto"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
