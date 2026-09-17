"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-config";
import { Badge } from "@/components/ui/badge";

export function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-sidebar-foreground/45 uppercase">
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
                <li key={item.href} className="relative">
                  {isActive && (
                    <span className="absolute top-1/2 -left-3 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
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
