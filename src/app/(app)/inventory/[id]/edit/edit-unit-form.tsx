"use client";

import { useActionState } from "react";
import { updateInventoryUnit } from "../../actions";
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
import { CONDITION_LABELS } from "@/lib/format";
import { ConditionGrade } from "@/generated/prisma/enums";

type Location = { id: string; name: string };

export function EditUnitForm({
  unitId,
  locations,
  defaultValues,
}: {
  unitId: string;
  locations: Location[];
  defaultValues: {
    locationId: string;
    condition: string;
    imei: string;
    serialNumber: string;
    batteryPct: number | null;
    isNew: boolean;
    minPrice: number | null;
    notes: string;
  };
}) {
  const action = updateInventoryUnit.bind(null, unitId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const locationLabels = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="locationId">Ubicacion</Label>
              <Select name="locationId" defaultValue={defaultValues.locationId}>
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
              <Select name="condition" defaultValue={defaultValues.condition}>
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
              <Input id="imei" name="imei" defaultValue={defaultValues.imei} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="serialNumber">Numero de serie</Label>
              <Input id="serialNumber" name="serialNumber" defaultValue={defaultValues.serialNumber} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="batteryPct">Bateria (%)</Label>
              <Input
                id="batteryPct"
                name="batteryPct"
                type="number"
                min={0}
                max={100}
                defaultValue={defaultValues.batteryPct ?? undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minPrice">Precio minimo (opcional)</Label>
              <Input
                id="minPrice"
                name="minPrice"
                type="number"
                step="0.01"
                defaultValue={defaultValues.minPrice ?? undefined}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="isNew"
                name="isNew"
                type="checkbox"
                className="size-4"
                defaultChecked={defaultValues.isNew}
              />
              <Label htmlFor="isNew" className="font-normal">
                Es un equipo nuevo (sellado)
              </Label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues.notes} />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
