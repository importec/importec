"use client";

import { useActionState } from "react";
import { resetPassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const action = resetPassword.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nueva contrasena</Label>
        <Input id="password" name="password" type="password" minLength={8} required className="w-48" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Restablecer contrasena"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
