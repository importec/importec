import { NavContent } from "./nav-content";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          I
        </div>
        <span className="text-sm font-semibold tracking-tight">Importec</span>
      </div>
      <NavContent />
    </aside>
  );
}
