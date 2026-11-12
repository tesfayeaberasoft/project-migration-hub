import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/services/http";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-primary ${className}`} />;
}

export function LoadingBlock({ label = "Loading…", rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" /> {label}
      </div>
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full bg-muted/70" />
      ))}
    </div>
  );
}

export function FullScreenLoader({ label = "Preparing your workspace…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Spinner className="h-8 w-8" />
      <div className="text-sm tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center animate-fade-in">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <div className="font-display text-lg font-semibold">{title}</div>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-6 w-6 text-destructive" />
      <div className="font-semibold">Couldn't load this information</div>
      <p className="mt-1 text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
