import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "gold" | "success" | "warning" | "danger" | "info" | "muted";

const toneIcon: Record<Tone, string> = {
  gold: "bg-primary/12 text-primary ring-primary/25",
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/12 text-warning ring-warning/25",
  danger: "bg-destructive/12 text-destructive ring-destructive/25",
  info: "bg-info/12 text-info ring-info/25",
  muted: "bg-muted text-muted-foreground ring-border",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
  delay = 0,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  delay?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-5 shadow-card card-hover animate-fade-up",
        highlight && "border-primary/35 bg-gold-soft",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 truncate font-display text-2xl font-semibold text-foreground sm:text-[1.7rem]">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1", toneIcon[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
