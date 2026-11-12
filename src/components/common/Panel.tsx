import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children, delay = 0 }: { className?: string; children: ReactNode; delay?: number }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-card animate-fade-up sm:p-6", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </section>
  );
}

/** Scrollable table container with consistent styling. */
export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto rounded-xl border bg-card shadow-card animate-fade-up", className)}>{children}</div>;
}

export function Field({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
