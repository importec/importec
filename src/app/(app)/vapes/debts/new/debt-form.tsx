"use client";

import { useActionState, useState } from "react";
import { createVapeDebt } from "../../actions";
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

type Product = { id: string; name: string; stockQuantity: number; currency: "USD" | "ARS" };

const CURRENCY_LABELS: Record<string, string> = { ARS: "Pesos (ARS)", USD: "Dolares (USD)" };

export function DebtForm({ products }: { products: Product[] }) {
  const [state, formAction, pending] = useActionState(createVapeDebt, undefined);
  const [productId, setProductId] = useState<string>("none");
  const [currency, setCurrency] = useState<"USD" | "ARS">("ARS");

  const selectedProduct = products.find((p) => p.id === productId);
  const productLabels: Record<string, string> = {
    none: "Sin producto especifico",
    ...Object.fromEntries(products.map((p) => [p.id, `${p.name} (${p.stockQuantity} en stock)`])),
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="debtorName">Nombre</Label>
            <Input id="debtorName" name="debtorName" placeholder="ej. Juan Perez" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefono (opcional)</Label>
            <Input id="phone" name="phone" placeholder="ej. 11 5555 5555" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="productId">Producto (opcional)</Label>
            <Select
              name="productId"
              value={productId}
              onValueChange={(value) => {
                const next = value ?? "none";
                setProductId(next);
                const product = products.find((p) => p.id === next);
                if (product) setCurrency(product.currency);
              }}
            >
              <SelectTrigger id="productId">
                <SelectValue>{(value: string) => productLabels[value] ?? "Elegi un producto"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin producto especifico</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.stockQuantity} en stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Si elegis un producto, la cantidad se descuenta del stock propio.
            </p>
          </div>

          {productId !== "none" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                max={selectedProduct?.stockQuantity}
                required
              />
            </div>
          )}

          {productId === "none" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Descripcion (que se llevo)</Label>
              <Input id="description" name="description" placeholder="ej. 3 vapes surtidos" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Monto adeudado</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min={0} required />
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
              {pending ? "Guardando..." : "Guardar deuda"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
