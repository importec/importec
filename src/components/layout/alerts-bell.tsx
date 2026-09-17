import Link from "next/link";
import { Bell } from "lucide-react";
import { getAlerts } from "@/server/queries/alerts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function AlertsBell() {
  const alerts = await getAlerts();
  const hasCritical = alerts.some((a) => a.severity === "critical");

  return (
    <Link
      href="/alerts"
      aria-label="Alertas"
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
    >
      <Bell className="size-4" />
      {alerts.length > 0 && (
        <span
          className={`absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full text-[9px] font-medium ${hasCritical ? "bg-destructive text-white" : "bg-warning text-warning-foreground"}`}
        >
          {alerts.length > 9 ? "9+" : alerts.length}
        </span>
      )}
    </Link>
  );
}
