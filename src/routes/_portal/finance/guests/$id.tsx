import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Banknote, Download, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CreditSummary } from "@/components/common/CreditSummary";
import { PageHeader } from "@/components/common/PageHeader";
import { TableShell } from "@/components/common/Panel";
import { EmptyState, Spinner } from "@/components/common/States";
import { AccountStatusBadge, HistoricalStatusBadge } from "@/components/common/StatusBadge";
import { CreditLimitDialog } from "@/components/finance/CreditLimitDialog";
import { PaymentsTable } from "@/components/finance/PaymentParts";
import { TransactionsTable } from "@/components/transactions/TransactionParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { date, dateTime, money } from "@/lib/format";
import { downloadStatementPdf } from "@/lib/pdf";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { errorMessage } from "@/services/http";

export const Route = createFileRoute("/_portal/finance/guests/$id")({
  head: () => pageHead("Guest Account", "A guest's balance, transactions, payments and credit limit history."),
  loader: ({ context, params }) => Promise.all([context.queryClient.ensureQueryData(q.guestDetail(params.id)), context.queryClient.ensureQueryData(q.settings())]),
  component: GuestDetailPage,
});

function GuestDetailPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(q.guestDetail(id));
  const { data: settings } = useSuspenseQuery(q.settings());
  const [limitOpen, setLimitOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const a = data.account;
  const payments = data.payments ?? [];
  const historical = data.historical ?? [];
  const limits = data.limitChanges ?? [];

  const statement = async () => {
    setBusy(true);
    try {
      await downloadStatementPdf({ account: a, transactions: data.transactions, payments, historical }, settings);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/finance/guests">
          <ArrowLeft className="h-4 w-4" /> Guest finances
        </Link>
      </Button>
      <PageHeader
        eyebrow={`@${a.username} · ${a.phone}`}
        title={a.fullName}
        actions={
          <>
            <AccountStatusBadge status={a.status} />
            <Button variant="outline" onClick={() => void statement()} disabled={busy}>
              {busy ? <Spinner className="h-4 w-4 text-current" /> : <Download className="h-4 w-4" />} Statement
            </Button>
            <Button variant="gold" onClick={() => setLimitOpen(true)}>
              <KeyRound className="h-4 w-4" /> Change limit
            </Button>
            {a.outstandingDebt > 0 && (
              <Button asChild>
                <Link to="/finance/payments" search={{ guestId: a.id }}>
                  <Banknote className="h-4 w-4" /> Record payment
                </Link>
              </Button>
            )}
          </>
        }
      />
      <CreditSummary account={a} />
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Opening balance</div>
          <div className="font-semibold tabular-nums">{money(a.historicalDebt)}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Approved credit</div>
          <div className="font-semibold tabular-nums">{money(a.approvedCredit)}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Payments</div>
          <div className="font-semibold text-success tabular-nums">{money(a.totalPayments)}</div>
        </div>
      </div>

      <Tabs defaultValue="transactions" className="mt-8">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="transactions">Transactions ({data.transactions.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="historical">Opening balance ({historical.length})</TabsTrigger>
          <TabsTrigger value="limits">Limit changes ({limits.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="mt-4">
          <TransactionsTable rows={data.transactions} showGuest={false} detailTo="/finance/transactions/$id" />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTable rows={payments} showGuest={false} guestPhone={a.phone} />
        </TabsContent>
        <TabsContent value="historical" className="mt-4">
          {!historical.length ? (
            <EmptyState title="No opening balance records" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Original date</TableHead>
                    <TableHead>Entered by</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historical.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.sourceReference}</TableCell>
                      <TableCell>{date(h.originalDate)}</TableCell>
                      <TableCell className="text-sm">{h.enteredBy}</TableCell>
                      <TableCell>
                        <HistoricalStatusBadge status={h.status} />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{money(h.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </TabsContent>
        <TabsContent value="limits" className="mt-4">
          {!limits.length ? (
            <EmptyState title="The limit has never been changed" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">From</TableHead>
                    <TableHead className="text-right">To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {limits.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap text-sm">{dateTime(c.changedAt)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{money(c.previousLimit)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {money(c.newLimit)} <Badge variant={c.newLimit >= c.previousLimit ? "success" : "warning"}>{c.newLimit >= c.previousLimit ? "↑" : "↓"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.reason}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{c.changedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </TabsContent>
      </Tabs>
      {limitOpen && <CreditLimitDialog account={a} onClose={() => setLimitOpen(false)} />}
    </>
  );
}
