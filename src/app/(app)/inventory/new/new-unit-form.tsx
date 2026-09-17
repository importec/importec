"use client";

import { useActionState, useState } from "react";
import { createInventoryUnit } from "../actions";
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
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/format";
import { ProductCategory, ConditionGrade } from "@/generated/prisma/enums";

type Product = {
  id: string;
  category: string;
  brand: string;
  model: string;
  variant: string | null;
  storageGb: number | null;
  color: string | null;
};

type Location = { id: string; name: string };

export function NewUnitForm({
  products,
  locations,
}: {
  products: Product[];
  locations: Location[];
}) {
  const [state, formAction, pending] = useActionState(createInventoryUnit, undefined);
  const [productId, setProductId] = useState<string>("new");

  const productLabels: Record<string, string> = {
    new: "+ Crear producto nuevo",
    ...Object.fromEntries(
      products.map((product) => [
        product.id,
        [product.brand, product.model, product.variant, product.storageGb ? `${product.storageGb}GB` : null, product.color]
          .filter(Boolean)
          .join(" "),
      ]),
    ),
  };
  const locationLabels = Object.fromEntries(locations.map((location) => [location.id, location.name]));

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-medium">Producto</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="productId">Elegi un producto existente o carga uno nuevo</Label>
              <Select
                name="productId"
                value={productId}
                onValueChange={(value) => setProductId(value ?? "new")}
              >
                <SelectTrigger id="productId">
                  <SelectValue>{(value: string) => productLabels[value] ?? "Elegi un producto"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Crear producto nuevo</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {[product.brand, product.model, product.variant, product.storageGb ? `${product.storageGb}GB` : null, product.color]
                        .filter(Boolean)
                        .join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {productId === "new" && (
              <div className="grid grid-cols-1 gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
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
                  <Input id="model" name="model" placeholder="iPhone 15 Pro Max" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="variant">Variante (opcional)</Label>
                  <Input id="variant" name="variant" placeholder="ej. Titanio natural" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="storageGb">Capacidad en GB</Label>
                  <Input id="storageGb" name="storageGb" type="number" placeholder="256" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" placeholder="Negro" />
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
                  <SelectValue>{(value: string) => locationLabels[value] ?? "Ubicacion"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="condition">Condicion</Label>
              <Select name="condition" defaultValue={ConditionGrade.GOOD}>
                <SelectTrigger id="condition">
                  <SelectValue>{(value: string) => CONDITION_LABELS[value] ?? "Condicion"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ConditionGrade).map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {CONDITION_LABELS[condition]}
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
            <div className="flex items-center gap-2 pt-6">
              <input id="isNew" name="isNew" type="checkbox" className="size-4" />
              <Label htmlFor="isNew" className="font-normal">
                Es un equipo nuevo (sellado)
              </Label>
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <legend className="mb-1 text-sm font-medium">Precios</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cost">Costo (USD)</Label>
              <Input id="cost" name="cost" type="number" step="0.01" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="listPrice">Precio de lista (USD)</Label>
              <Input id="listPrice" name="listPrice" type="number" step="0.01" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minPrice">Precio minimo (opcional)</Label>
              <Input id="minPrice" name="minPrice" type="number" step="0.01" />
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

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar equipo"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
