import { Badge } from "@/components/ui/badge";
import { fromNow } from "@/lib/format";
import type { AuditLog } from "@/types";

export function AuditList({ items }: { items: AuditLog[] }) {
  return (
    <ul className="divide-y">
      {items.map((a) => (
        <li key={a.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">{a.action}</div>
            <div className="truncate text-xs text-muted-foreground">
              {a.actor}
              {a.details ? ` · ${a.details}` : ""}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <Badge variant="muted" className="capitalize">
              {a.category}
            </Badge>
            <div className="mt-1 text-[11px] text-muted-foreground">{fromNow(a.at)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
