"use client";

import { useActionState } from "react";
import { updateUser } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { UserRole } from "@/generated/prisma/enums";

export function UserEditForm({
  userId,
  role,
  isActive,
}: {
  userId: string;
  role: UserRole;
  isActive: boolean;
}) {
  const action = updateUser.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Rol</label>
        <Select name="role" defaultValue={role}>
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string) => ROLE_LABELS[v as UserRole] ?? "Rol"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.values(UserRole).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={isActive} className="size-4" />
        Activo
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
