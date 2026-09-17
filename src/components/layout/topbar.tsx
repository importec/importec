import type { UserRole } from "@/generated/prisma/enums";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { AlertsBell } from "./alerts-bell";

export function Topbar({ name, role }: { name: string; role: UserRole }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
      <MobileNav />
      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>
      <AlertsBell />
      <ThemeToggle />
      <div className="shrink-0">
        <UserMenu name={name} role={role} />
      </div>
    </header>
  );
}
