import { Badge } from "@/components/ui/badge";
import type { AccountStatus, HistoricalStatus, TransactionStatus } from "@/types";

const TX: Record<TransactionStatus, { label: string; variant: "gold" | "success" | "warning" | "danger" | "info" | "muted" }> = {
  pending_price_approval: { label: "Awaiting price approval", variant: "info" },
  pending_guest: { label: "Pending guest", variant: "warning" },
  disputed: { label: "Disputed", variant: "danger" },
  pending_finance: { label: "Pending finance", variant: "gold" },
  pending_exception: { label: "Exceptional approval", variant: "danger" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "muted" },
  expired: { label: "Expired", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

export const TX_STATUS_LABEL = Object.fromEntries(Object.entries(TX).map(([k, v]) => [k, v.label])) as Record<TransactionStatus, string>;

export function TxStatusBadge({ status }: { status: TransactionStatus }) {
  const s = TX[status];
  return (
    <Badge variant={s.variant} className="whitespace-nowrap">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </Badge>
  );
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const v = status === "active" ? "success" : status === "suspended" ? "danger" : "muted";
  return (
    <Badge variant={v} className="capitalize">
      {status}
    </Badge>
  );
}

export function HistoricalStatusBadge({ status }: { status: HistoricalStatus }) {
  const map = { pending_verification: ["Pending verification", "warning"], approved: ["Opening balance", "success"], rejected: ["Rejected", "muted"] } as const;
  const [label, v] = map[status];
  return <Badge variant={v}>{label}</Badge>;
}
