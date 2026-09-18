"use client";

import { useActionState } from "react";
import { createCatalogEntry } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/format";
import { ProductCategory } from "@/generated/prisma/enums";

const CURRENCY_LABELS: Record<string, string> = { USD: "Dolares (USD)", ARS: "Pesos (ARS)" };

export function CatalogForm() {
  const [state, formAction, pending] = useActionState(createCatalogEntry, undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select name="category" defaultValue={ProductCategory.IPHONE}>
                <SelectTrigger id="category">
                  <SelectValue>{(value: string) => CATEGORY_LABELS[value] ?? "Categoria"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProductCategory).map((category) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" name="brand" defaultValue="Apple" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" name="model" placeholder="iPhone 13" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="variant">Variante (opcional)</Label>
              <Input id="variant" name="variant" placeholder="ej. Pro Max" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="storageGb">Capacidad en GB (opcional)</Label>
              <Input id="storageGb" name="storageGb" type="number" placeholder="128" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select name="currency" defaultValue="USD">
                <SelectTrigger id="currency">
                  <SelectValue>{(v: string) => CURRENCY_LABELS[v] ?? "Moneda"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">Dolares (USD)</SelectItem>
                  <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-sm font-medium">Precios que pagamos por condicion</p>
            <p className="text-xs text-muted-foreground">Dejá vacio lo que no compres en esa condicion.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sealedPrice">Sellado / nuevo</Label>
              <Input id="sealedPrice" name="sealedPrice" type="number" step="0.01" min={0} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="likeNewPrice">Como nuevo</Label>
              <Input id="likeNewPrice" name="likeNewPrice" type="number" step="0.01" min={0} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goodPrice">Bueno</Label>
              <Input id="goodPrice" name="goodPrice" type="number" step="0.01" min={0} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fairPrice">Regular</Label>
              <Input id="fairPrice" name="fairPrice" type="number" step="0.01" min={0} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar modelo"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
