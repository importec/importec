"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavContent } from "./nav-content";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-14 justify-center border-b">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              I
            </div>
            Importec
          </SheetTitle>
        </SheetHeader>
        <NavContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
