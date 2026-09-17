"use client";

import { useActionState } from "react";
import { createUser } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { UserRole } from "@/generated/prisma/enums";

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Rol</Label>
            <Select name="role" defaultValue={UserRole.SALES}>
              <SelectTrigger id="role">
                <SelectValue>{(v: string) => ROLE_LABELS[v as UserRole] ?? "Rol"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(UserRole).map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Crear usuario"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
