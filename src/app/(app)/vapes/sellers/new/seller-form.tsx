"use client";

import { useActionState } from "react";
import { createVapeSeller } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export function SellerForm() {
  const [state, formAction, pending] = useActionState(createVapeSeller, undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar vendedor"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
