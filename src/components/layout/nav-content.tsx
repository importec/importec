"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-config";
import { Badge } from "@/components/ui/badge";

export function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              if (item.comingSoon) {
                return (
                  <li key={item.href}>
                    <div className="flex cursor-not-allowed items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/50">
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {item.label}
                      </span>
                      <Badge
                        variant="secondary"
                        className="pointer-events-none px-1.5 py-0 text-[10px] font-normal"
                      >
                        Pronto
                      </Badge>
                    </div>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
