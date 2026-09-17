import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  trendPct,
  size = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "positive" | "warning";
  trendPct?: number | null;
  size?: "default" | "hero";
}) {
  const isHero = size === "hero";

  return (
    <Card className={cn(isHero && "sm:col-span-2")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="flex size-7 items-center justify-center rounded-md bg-muted">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <div
            className={cn(
              "font-semibold tracking-tight tabular-nums",
              isHero ? "text-3xl" : "text-2xl",
              tone === "positive" && "text-success",
              tone === "warning" && "text-warning-foreground dark:text-warning",
            )}
          >
            {value}
          </div>
          {trendPct != null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                trendPct >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {trendPct >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {trendPct >= 0 ? "+" : ""}
              {trendPct.toFixed(1)}%
            </span>
          )}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
