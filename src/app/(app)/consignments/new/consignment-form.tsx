"use client";

import { useActionState, useState } from "react";
import { createConsignment } from "../actions";
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
import { CustomerPicker, type PickedCustomer } from "@/components/customers/customer-picker";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/format";
import { ProductCategory, ConditionGrade } from "@/generated/prisma/enums";

type Product = {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  storageGb: number | null;
  color: string | null;
};
type Location = { id: string; name: string };

export function ConsignmentForm({ products, locations }: { products: Product[]; locations: Location[] }) {
  const [state, formAction, pending] = useActionState(createConsignment, undefined);
  const [productId, setProductId] = useState("new");
  const [owner, setOwner] = useState<PickedCustomer | null>(null);

  const productLabels: Record<string, string> = {
    new: "+ Crear producto nuevo",
    ...Object.fromEntries(
      products.map((p) => [
        p.id,
        [p.brand, p.model, p.variant, p.storageGb ? `${p.storageGb}GB` : null, p.color].filter(Boolean).join(" "),
      ]),
    ),
  };
  const locationLabels = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">Cliente que consigna</legend>
            <CustomerPicker value={owner} onChange={setOwner} />
            <input type="hidden" name="ownerCustomerId" value={owner?.id ?? ""} />
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-medium">Producto</legend>
            <Select name="productId" value={productId} onValueChange={(v) => v && setProductId(v)}>
              <SelectTrigger>
                <SelectValue>{(v: string) => productLabels[v] ?? "Elegi un producto"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Crear producto nuevo</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {productLabels[p.id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {productId === "new" && (
              <div className="grid grid-cols-1 gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select name="category" defaultValue={ProductCategory.IPHONE}>
                    <SelectTrigger id="category">
                      <SelectValue>{(v: string) => CATEGORY_LABELS[v] ?? "Categoria"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ProductCategory).map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
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
                  <Input id="variant" name="variant" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="storageGb">Capacidad en GB</Label>
                  <Input id="storageGb" name="storageGb" type="number" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" />
                </div>
              </div>
            )}
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-medium">Unidad fisica</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="locationId">Ubicacion</Label>
              <Select name="locationId" defaultValue={locations[0]?.id}>
                <SelectTrigger id="locationId">
                  <SelectValue>{(v: string) => locationLabels[v] ?? "Ubicacion"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="condition">Condicion</Label>
              <Select name="condition" defaultValue={ConditionGrade.GOOD}>
                <SelectTrigger id="condition">
                  <SelectValue>{(v: string) => CONDITION_LABELS[v] ?? "Condicion"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ConditionGrade).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="imei">IMEI</Label>
              <Input id="imei" name="imei" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="serialNumber">Numero de serie</Label>
              <Input id="serialNumber" name="serialNumber" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="batteryPct">Bateria (%)</Label>
              <Input id="batteryPct" name="batteryPct" type="number" min={0} max={100} />
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <legend className="mb-1 text-sm font-medium">Condiciones de consignacion</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="listPrice">Precio de venta acordado</Label>
              <Input id="listPrice" name="listPrice" type="number" step="0.01" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minPrice">Precio minimo (opcional)</Label>
              <Input id="minPrice" name="minPrice" type="number" step="0.01" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="commissionPct">Comision (%)</Label>
              <Input id="commissionPct" name="commissionPct" type="number" step="0.1" defaultValue={15} required />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-3">
              <Label htmlFor="termEndAt">Vencimiento del plazo (opcional)</Label>
              <Input id="termEndAt" name="termEndAt" type="date" className="max-w-xs" />
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !owner}>
              {pending ? "Guardando..." : "Guardar consignacion"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
