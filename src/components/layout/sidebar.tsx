import Image from "next/image";
import { NavContent } from "./nav-content";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b px-5">
        <Image src="/importec-icon.png" alt="Importec" width={28} height={28} className="rounded-lg" />
        <span className="text-sm font-semibold tracking-tight">Importec</span>
      </div>
      <NavContent />
    </aside>
  );
}
