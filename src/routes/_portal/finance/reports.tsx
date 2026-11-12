import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CreditPaymentsChart } from "@/components/common/Charts";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel, TableShell } from "@/components/common/Panel";
import { EmptyState, ErrorState, LoadingBlock, Spinner } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadReportXlsx } from "@/lib/excel";
import { date, money } from "@/lib/format";
import { downloadReportPdf } from "@/lib/pdf";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { errorMessage } from "@/services/http";
import type { ReportPeriod, ReportType } from "@/types";

export const Route = createFileRoute("/_portal/finance/reports")({
  head: () => pageHead("Financial Reports", "Daily to yearly reports on credit, payments and debt, as PDF or Excel."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(q.report("summary", "monthly")), context.queryClient.ensureQueryData(q.settings())]),
  component: ReportsPage,
});

const TYPES: { id: ReportType; label: string }[] = [
  { id: "summary", label: "Financial summary" },
  { id: "credit_transactions", label: "Credit transactions" },
  { id: "payments", label: "Payments" },
  { id: "guest_debt", label: "Debt by guest" },
  { id: "outstanding", label: "Outstanding balances" },
  { id: "historical", label: "Historical debt" },
];
const PERIODS: ReportPeriod[] = ["daily", "weekly", "monthly", "yearly"];

function ReportsPage() {
  const [type, setType] = useState<ReportType>("summary");
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const { data: settings } = useSuspenseQuery(q.settings());
  const report = useQuery({ ...q.report(type, period), placeholderData: (p) => p });
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const r = report.data;

  const run = async (kind: "pdf" | "xlsx") => {
    if (!r) return;
    setBusy(kind);
    try {
      if (kind === "pdf") await downloadReportPdf(r, settings);
      else await downloadReportXlsx(r, settings.hotelName);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Financial reports"
        description={r ? `${r.title} · ${date(r.from)} – ${date(r.to)}` : ""}
        actions={
          <>
            <Button variant="outline" onClick={() => void run("xlsx")} disabled={!r || busy !== null}>
              {busy === "xlsx" ? <Spinner className="h-4 w-4 text-current" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
            </Button>
            <Button onClick={() => void run("pdf")} disabled={!r || busy !== null}>
              {busy === "pdf" ? <Spinner className="h-4 w-4 text-current" /> : <FileText className="h-4 w-4" />} PDF
            </Button>
          </>
        }
      />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="r-type">Report</Label>
          <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
            <SelectTrigger id="r-type" className="w-full bg-surface sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p} value={p} className="capitalize">
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {report.isFetching && <Spinner className="h-4 w-4 text-primary" />}
      </div>

      {report.isError ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} />
      ) : !r ? (
        <LoadingBlock />
      ) : (
        <>
          {r.totals.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {r.totals.map((t, i) => (
                <div key={t.label} className="rounded-xl border bg-card p-5 shadow-card animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.label}</div>
                  <div className="mt-2 font-display text-2xl font-semibold">{/count|records|guests/i.test(t.label) ? t.value.toLocaleString() : money(t.value)}</div>
                </div>
              ))}
            </div>
          )}
          {r.series.length > 0 && (
            <Panel className="mt-6">
              <SectionTitle title="Credit vs payments" />
              <CreditPaymentsChart data={r.series} height={240} />
            </Panel>
          )}
          <div className="mt-6">
            <SectionTitle title="Details" />
            {!r.rows.length ? (
              <EmptyState title="No records in this period" />
            ) : (
              <TableShell>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {r.columns.map((c) => (
                        <TableHead key={c.key} className={c.money ? "text-right" : ""}>
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.rows.map((row, i) => (
                      <TableRow key={i}>
                        {r.columns.map((c) => {
                          const v = row[c.key];
                          return (
                            <TableCell key={c.key} className={c.money ? "text-right tabular-nums" : "text-sm"}>
                              {c.money ? money(Number(v ?? 0)) : String(v ?? "—")}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableShell>
            )}
          </div>
        </>
      )}
    </>
  );
}
