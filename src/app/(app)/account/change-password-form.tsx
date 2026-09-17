"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { changeOwnPassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPassword, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success("Contrasena actualizada");
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Contrasena actual</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">Contrasena nueva</Label>
        <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Repetir contrasena nueva</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Cambiar contrasena"}
        </Button>
      </div>
    </form>
  );
}
