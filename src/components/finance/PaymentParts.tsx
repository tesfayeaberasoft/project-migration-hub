import { useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { TableShell } from "@/components/common/Panel";
import { EmptyState, Spinner } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { date, money } from "@/lib/format";
import { q } from "@/lib/queries";
import { errorMessage } from "@/services/http";
import type { Payment } from "@/types";

export function PaymentMethodBadge({ method }: { method: Payment["method"] }) {
  return <Badge variant={method === "cash" ? "gold" : "info"}>{method === "cash" ? "Cash" : "Bank transfer"}</Badge>;
}

export function ReceiptButton({
  payment,
  guestPhone,
  label = "Receipt",
  variant = "outline",
  size = "sm",
}: {
  payment: Payment;
  guestPhone?: string | undefined;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      disabled={busy || !payment.verified}
      title={payment.verified ? "Download PDF receipt" : "Receipts are issued after the payment is verified"}
      onClick={async () => {
        setBusy(true);
        try {
          const settings = await qc.fetchQuery(q.settings());
          let phone = guestPhone;
          if (!phone) {
            const accounts = await qc.fetchQuery(q.guestAccounts()).catch(() => []);
            phone = accounts.find((a) => a.id === payment.guestId)?.phone;
          }
          const { downloadReceiptPdf } = await import("@/lib/pdf");
          await downloadReceiptPdf(payment, { guestPhone: phone, settings });
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Spinner className="h-4 w-4 text-current" /> : <Download className="h-4 w-4" />} {label}
    </Button>
  );
}

export function PaymentsTable({
  rows,
  showGuest = true,
  guestPhone,
  actions,
}: {
  rows: Payment[];
  showGuest?: boolean;
  guestPhone?: string | undefined;
  actions?: (p: Payment) => ReactNode;
}) {
  if (!rows.length) return <EmptyState title="No payments yet" description="Payments recorded by the Finance Manager appear here." />;
  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Receipt no.</TableHead>
            {showGuest && <TableHead>Guest</TableHead>}
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Remaining balance</TableHead>
            <TableHead>Recorded by</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Receipt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="whitespace-nowrap">{date(p.paidAt)}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">{p.receiptNumber}</TableCell>
              {showGuest && <TableCell className="whitespace-nowrap">{p.guestName}</TableCell>}
              <TableCell>
                <PaymentMethodBadge method={p.method} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(p.amount)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{p.verified ? money(p.balanceAfter) : "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">{p.recordedBy}</TableCell>
              <TableCell>{p.verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Awaiting verification</Badge>}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {actions?.(p)}
                  <ReceiptButton payment={p} guestPhone={guestPhone} label="PDF" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableShell>
  );
}
