"use client";

import { useActionState } from "react";
import { assignStockToSeller } from "../../actions";
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

type Product = { id: string; name: string; flavor: string | null; stockQuantity: number };

export function AssignForm({ sellerId, products }: { sellerId: string; products: Product[] }) {
  const action = assignStockToSeller.bind(null, sellerId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const labels = Object.fromEntries(
    products.map((p) => [p.id, `${[p.name, p.flavor].filter(Boolean).join(" - ")} (${p.stockQuantity} en stock)`]),
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="productId">Producto</Label>
        <Select name="productId" defaultValue={products[0]?.id}>
          <SelectTrigger id="productId" className="w-full">
            <SelectValue>{(v: string) => labels[v] ?? "Elegi un producto"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {labels[p.id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="quantity">Cantidad</Label>
        <Input id="quantity" name="quantity" type="number" min={1} required className="w-24" />
      </div>
      <Button type="submit" disabled={pending || products.length === 0}>
        {pending ? "Asignando..." : "Asignar stock"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
