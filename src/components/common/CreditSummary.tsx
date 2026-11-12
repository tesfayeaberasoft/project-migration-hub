import { AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GuestAccount } from "@/types";

/** Credit position: Available = max(0, Limit − Outstanding − Pending reservations). */
export function CreditSummary({ account, className, compact = false }: { account: GuestAccount; className?: string; compact?: boolean }) {
  const used = account.creditLimit > 0 ? Math.min(100, ((account.outstandingDebt + account.pendingReservations) / account.creditLimit) * 100) : 100;
  const items = [
    { label: "Credit limit", value: account.creditLimit },
    { label: "Outstanding debt", value: account.outstandingDebt },
    { label: "Pending reservations", value: account.pendingReservations },
    { label: "Available credit", value: account.availableCredit, strong: true },
  ];
  return (
    <div className={cn("rounded-xl border bg-surface p-4", className)}>
      <div className={cn("grid gap-4", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4")}>
        {items.map((i) => (
          <div key={i.label}>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{i.label}</div>
            <div className={cn("mt-1 font-semibold tabular-nums", i.strong ? "text-lg text-primary" : "text-sm")}>{money(i.value)}</div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Progress value={used} className={cn("h-1.5 bg-muted", account.exceedsLimit && "[&>div]:bg-destructive")} />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{used.toFixed(0)}% of limit used or reserved</span>
          {account.exceedsLimit && (
            <span className="inline-flex items-center gap-1 font-semibold text-destructive">
              <AlertTriangle className="h-3 w-3" /> Over limit
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
