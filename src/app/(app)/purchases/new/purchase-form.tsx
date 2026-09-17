"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createPurchase } from "../actions";
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
import { formatCurrency } from "@/lib/format";

type Product = {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  storageGb: number | null;
  color: string | null;
  isSerialized: boolean;
};

type Item = { productId: string; quantity: number; unitCost: number };

export function PurchaseForm({
  suppliers,
  products,
  initialSupplierId,
}: {
  suppliers: { id: string; name: string }[];
  products: Product[];
  initialSupplierId?: string;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(initialSupplierId ?? suppliers[0]?.id ?? "");
  const [currency, setCurrency] = useState<"USD" | "ARS">("USD");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [pending, setPending] = useState(false);

  const productLabel = (p: Product) =>
    [p.brand, p.model, p.variant, p.storageGb ? `${p.storageGb}GB` : null, p.color].filter(Boolean).join(" ");
  const supplierLabels = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  const productLabels = Object.fromEntries(products.map((p) => [p.id, productLabel(p)]));

  const total = items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);

  function addItem() {
    if (!products[0]) return;
    setItems((prev) => [...prev, { productId: products[0].id, quantity: 1, unitCost: 0 }]);
  }

  async function handleSubmit() {
    setPending(true);
    const result = await createPurchase({
      supplierId,
      currency,
      notes: notes || undefined,
      items,
    });
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
    } else if (result?.id) {
      router.push(`/purchases/${result.id}`);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Proveedor</Label>
            <Select value={supplierId} onValueChange={(v) => v && setSupplierId(v)}>
              <SelectTrigger>
                <SelectValue>{(v: string) => supplierLabels[v] ?? "Elegi un proveedor"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v as "USD" | "ARS")}>
              <SelectTrigger>
                <SelectValue>{(v: string) => v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="ARS">ARS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>Productos</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="size-4" />
              Agregar producto
            </Button>
          </div>
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavia no agregaste productos.</p>
          )}
          {items.map((item, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
              <Select
                value={item.productId}
                onValueChange={(v) =>
                  v && setItems((prev) => prev.map((it, i) => (i === index ? { ...it, productId: v } : it)))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue>{(v: string) => productLabels[v] ?? "Producto"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {productLabel(p)} {p.isSerialized ? "" : "(accesorio)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) => (i === index ? { ...it, quantity: Number(e.target.value) || 1 } : it)),
                  )
                }
                className="w-20"
                placeholder="Cant."
              />
              <Input
                type="number"
                step="0.01"
                value={item.unitCost}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) => (i === index ? { ...it, unitCost: Number(e.target.value) || 0 } : it)),
                  )
                }
                className="w-28"
                placeholder="Costo u."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            Los productos marcados como accesorio suman stock automaticamente al recibir la compra. Los
            equipos serializados se cargan despues, uno por uno, desde Inventario (con su IMEI).
          </p>
          <div className="flex justify-end text-base font-semibold">Total: {formatCurrency(total, currency)}</div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Observaciones</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="flex justify-end">
          <Button disabled={!supplierId || items.length === 0 || pending} onClick={handleSubmit}>
            {pending ? "Guardando..." : "Registrar compra"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
