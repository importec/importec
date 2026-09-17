import { cn } from "cn"

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral"

const DOT_TONE: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
}

const TEXT_TONE: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning-foreground dark:text-warning",
  danger: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
}

export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return <span className={cn("inline-block size-1.5 shrink-0 rounded-full", DOT_TONE[tone], className)} />
}

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap", TEXT_TONE[tone], className)}>
      <StatusDot tone={tone} />
      {children}
    </span>
  )
}
