import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, FileUp, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FormDialog, TextField } from "@/components/common/FormDialog";
import { GuestPicker } from "@/components/common/GuestPicker";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel, TableShell } from "@/components/common/Panel";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/States";
import { HistoricalStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAction } from "@/hooks/use-action";
import { parseHistoricalCsv } from "@/lib/csv";
import { date, money, moneyCompact } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { historicalService } from "@/services/finance.service";
import type { HistoricalDebt, HistoricalStatus } from "@/types";
import { BadgeCheck, Hourglass, Landmark, Scale } from "lucide-react";

export const Route = createFileRoute("/_portal/finance/historical")({
  head: () => pageHead("Historical Debt", "Move earlier paper debt records into the system and reconcile them."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(q.historical()), context.queryClient.ensureQueryData(q.reconciliation())]),
  component: HistoricalPage,
});

function HistoricalPage() {
  const { data: records } = useSuspenseQuery(q.historical());
  const { data: r } = useSuspenseQuery(q.reconciliation());
  const [tab, setTab] = useState<HistoricalStatus | "all">("pending_verification");
  const [adding, setAdding] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRows = useAction((rows: ReturnType<typeof parseHistoricalCsv>) => historicalService.importRows(rows), {
    success: (res) => `${res.created} record${res.created === 1 ? "" : "s"} imported for verification.`,
    onSuccess: setImportResult,
  });
  const rows = records.filter((h) => tab === "all" || h.status === tab);
  const pct = r.target > 0 ? Math.min(100, (r.approved / r.target) * 100) : 0;

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const parsed = parseHistoricalCsv(await file.text());
    if (!parsed.length) return void toast.error("No rows found in that file.");
    importRows.mutate(parsed);
  };

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Historical debt"
        description="Debt from the earlier paper records becomes each guest's opening balance once you verify it."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="CSV file" onChange={(e) => void onFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importRows.isPending}>
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add record
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Target from paper records" value={moneyCompact(r.target)} hint={money(r.target)} icon={Landmark} tone="muted" />
        <StatCard label="Verified opening balances" value={moneyCompact(r.approved)} hint={`${pct.toFixed(1)}% of target`} icon={BadgeCheck} tone="success" delay={40} highlight />
        <StatCard label="Awaiting verification" value={moneyCompact(r.pending)} hint={money(r.pending)} icon={Hourglass} tone="warning" delay={80} />
        <StatCard label="Difference to target" value={moneyCompact(r.difference)} hint={`${r.records} records · ${money(r.rejected)} rejected`} icon={Scale} tone={Math.abs(r.difference) < 1 ? "success" : "info"} delay={120} />
      </div>
      <Progress value={pct} className="mt-4 h-2 bg-muted" />

      {importResult && importResult.errors.length > 0 && (
        <Panel className="mt-6 border-warning/30">
          <SectionTitle
            title={`${importResult.errors.length} row${importResult.errors.length === 1 ? "" : "s"} could not be imported`}
            action={
              <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>
                Dismiss
              </Button>
            }
          />
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {importResult.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Panel>
      )}
      <p className="mt-4 text-xs text-muted-foreground">CSV columns: username, amount, source reference, original date (YYYY-MM-DD). A header row is optional.</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as HistoricalStatus | "all")} className="mb-4 mt-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="pending_verification">To verify ({records.filter((h) => h.status === "pending_verification").length})</TabsTrigger>
          <TabsTrigger value="approved">Verified</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      {!rows.length ? (
        <EmptyState title="No records here" />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Source reference</TableHead>
                <TableHead>Original date</TableHead>
                <TableHead>Entered by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Verify</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => (
                <HistoricalRow key={h.id} h={h} />
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
      {adding && <AddHistoricalDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function HistoricalRow({ h }: { h: HistoricalDebt }) {
  const approve = useAction(() => historicalService.approve(h.id), { success: `Opening balance verified for ${h.guestName}.` });
  const reject = useAction(() => historicalService.reject(h.id), { success: "Record rejected." });
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap font-medium">{h.guestName}</TableCell>
      <TableCell className="text-sm">
        {h.sourceReference}
        {h.evidenceNote && <div className="text-xs text-muted-foreground">{h.evidenceNote}</div>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">{date(h.originalDate)}</TableCell>
      <TableCell className="whitespace-nowrap text-sm">{h.enteredBy}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{money(h.amount)}</TableCell>
      <TableCell>
        <HistoricalStatusBadge status={h.status} />
        {h.verifiedBy && <div className="mt-1 text-xs text-muted-foreground">{h.verifiedBy}</div>}
      </TableCell>
      <TableCell className="text-right">
        {h.status === "pending_verification" && (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="success" onClick={() => approve.mutate(undefined)} disabled={approve.isPending || reject.isPending} aria-label={`Verify ${h.guestName}`}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => reject.mutate(undefined)} disabled={approve.isPending || reject.isPending} aria-label={`Reject ${h.guestName}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function AddHistoricalDialog({ onClose }: { onClose: () => void }) {
  const [guestId, setGuestId] = useState("");
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [orig, setOrig] = useState("");
  const save = useAction(
    () =>
      historicalService.create({
        guestId,
        amount: Number(amount),
        sourceReference: ref.trim(),
        originalDate: orig ? new Date(`${orig}T12:00:00`).toISOString() : new Date().toISOString(),
        ...(note.trim() ? { evidenceNote: note.trim() } : {}),
      }),
    { success: "Record added for verification.", onSuccess: onClose },
  );
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Add historical record" description="It counts towards the guest's debt only after verification." submitLabel="Add record" pending={save.isPending} onSubmit={() => save.mutate(undefined)}>
      <div className="space-y-2">
        <Label>Guest</Label>
        <GuestPicker value={guestId} onChange={(g) => setGuestId(g.id)} includeInactive />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="h-amount" label="Amount (ETB)" type="number" required value={amount} onChange={setAmount} />
        <TextField id="h-date" label="Original date" type="date" value={orig} onChange={setOrig} />
      </div>
      <TextField id="h-ref" label="Source reference" required value={ref} onChange={setRef} placeholder="Ledger book, page, slip number" />
      <TextField id="h-note" label="Evidence note" value={note} onChange={setNote} placeholder="Optional" />
    </FormDialog>
  );
}
