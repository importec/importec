"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { markInstallmentPaid } from "../../actions";

type CashAccount = { id: string; name: string };

export function PayInstallmentButton({
  installmentId,
  cashAccounts,
}: {
  installmentId: string;
  cashAccounts: CashAccount[];
}) {
  const [open, setOpen] = useState(false);
  const action = markInstallmentPaid.bind(null, installmentId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const accountLabels = Object.fromEntries(cashAccounts.map((a) => [a.id, a.name]));

  if (cashAccounts.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin cuenta en esa moneda</p>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Check className="size-4" />
        Marcar pagada
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="end">
        <form action={formAction} className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Ingresa a la cuenta</label>
          <Select name="cashAccountId" defaultValue={cashAccounts[0]?.id}>
            <SelectTrigger>
              <SelectValue>{(v: string) => accountLabels[v] ?? "Cuenta"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cashAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando..." : "Confirmar cobro"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
