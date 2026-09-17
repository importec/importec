"use client";

import { useActionState, useState } from "react";
import { createRepair } from "../actions";
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

export function RepairForm({ techs }: { techs: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createRepair, undefined);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const techLabels: Record<string, string> = {
    unassigned: "Sin asignar",
    ...Object.fromEntries(techs.map((t) => [t.id, t.name])),
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Cliente</Label>
            <CustomerPicker value={customer} onChange={setCustomer} />
            <input type="hidden" name="customerId" value={customer?.id ?? ""} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="deviceDescription">Equipo</Label>
            <Input id="deviceDescription" name="deviceDescription" placeholder="iPhone 13 Pro Max" required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="imei">IMEI</Label>
              <Input id="imei" name="imei" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="serialNumber">Numero de serie</Label>
              <Input id="serialNumber" name="serialNumber" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reportedIssue">Falla reportada por el cliente</Label>
            <Textarea id="reportedIssue" name="reportedIssue" rows={2} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="receivedCondition">Condicion al recibirlo</Label>
            <Textarea id="receivedCondition" name="receivedCondition" rows={2} placeholder="Rayones, pantalla trizada, etc." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accessoriesReceived">Accesorios entregados</Label>
            <Input id="accessoriesReceived" name="accessoriesReceived" placeholder="Cargador, funda..." />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="assignedTechUserId">Tecnico asignado (opcional)</Label>
            <Select name="assignedTechUserId" defaultValue="unassigned">
              <SelectTrigger id="assignedTechUserId">
                <SelectValue>{(v: string) => techLabels[v] ?? "Sin asignar"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {techs.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !customer}>
              {pending ? "Guardando..." : "Registrar ingreso"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
