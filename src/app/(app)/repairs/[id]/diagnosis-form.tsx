"use client";

import { useActionState } from "react";
import { updateDiagnosis } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Repair = {
  diagnosis: string | null;
  laborCost: string | null;
  partsCost: string | null;
  finalPrice: string | null;
};

export function DiagnosisForm({ repairId, repair }: { repairId: string; repair: Repair }) {
  const action = updateDiagnosis.bind(null, repairId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="diagnosis">Diagnostico</Label>
        <Textarea id="diagnosis" name="diagnosis" rows={3} defaultValue={repair.diagnosis ?? ""} required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="partsCost">Costo de repuestos</Label>
          <Input id="partsCost" name="partsCost" type="number" step="0.01" defaultValue={repair.partsCost ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="laborCost">Mano de obra (costo)</Label>
          <Input id="laborCost" name="laborCost" type="number" step="0.01" defaultValue={repair.laborCost ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="finalPrice">Precio final al cliente</Label>
          <Input id="finalPrice" name="finalPrice" type="number" step="0.01" defaultValue={repair.finalPrice ?? ""} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar diagnostico y presupuesto"}
        </Button>
      </div>
    </form>
  );
}
