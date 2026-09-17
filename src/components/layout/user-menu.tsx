import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { UserRole } from "@/generated/prisma/enums";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, UserCog } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ name, role }: { name: string; role: UserRole }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="hidden text-left sm:block">
          <p className="text-sm leading-tight font-medium">{name}</p>
          <p className="text-xs leading-tight text-muted-foreground">
            {ROLE_LABELS[role]}
          </p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{name}</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/account" />}>
            <UserCog className="size-4" />
            Mi cuenta
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem nativeButton render={<button type="submit" className="w-full" />}>
            <LogOut className="size-4" />
            Cerrar sesion
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
