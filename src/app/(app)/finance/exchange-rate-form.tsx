"use client";

import { useActionState } from "react";
import { setTodayExchangeRate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExchangeRateForm({ currentRate }: { currentRate: number | null }) {
  const [state, formAction, pending] = useActionState(setTodayExchangeRate, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="usdToArs">1 USD = ? ARS</Label>
        <Input
          id="usdToArs"
          name="usdToArs"
          type="number"
          step="0.01"
          min={0}
          defaultValue={currentRate ?? undefined}
          placeholder="ej. 1050"
          required
          className="w-32"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Actualizar"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
