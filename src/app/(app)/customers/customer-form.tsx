"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerFormState } from "./actions";

type Customer = {
  firstName: string;
  lastName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  docId: string | null;
  notes: string | null;
};

export function CustomerForm({
  action,
  customer,
  submitLabel = "Guardar cliente",
}: {
  action: (state: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  customer?: Customer;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" name="firstName" defaultValue={customer?.firstName} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" name="lastName" defaultValue={customer?.lastName} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input id="phone" name="phone" defaultValue={customer?.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" defaultValue={customer?.whatsapp ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="docId">Documento (opcional)</Label>
              <Input id="docId" name="docId" defaultValue={customer?.docId ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={customer?.notes ?? ""} />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
