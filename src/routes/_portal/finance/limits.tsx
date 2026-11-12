import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { TableShell } from "@/components/common/Panel";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/States";
import { CreditLimitDialog } from "@/components/finance/CreditLimitDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dateTime, money } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import type { GuestAccount } from "@/types";

export const Route = createFileRoute("/_portal/finance/limits")({
  head: () => pageHead("Credit Limits", "Set how much credit each guest may take, with a full change history."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(q.guestAccounts()), context.queryClient.ensureQueryData(q.limitHistory())]),
  component: LimitsPage,
});

function LimitsPage() {
  const { data: guests } = useSuspenseQuery(q.guestAccounts());
  const { data: history } = useSuspenseQuery(q.limitHistory());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<GuestAccount | null>(null);
  const term = search.toLowerCase().replace(/\s/g, "");
  const rows = guests.filter((g) => `${g.fullName}${g.username}${g.phone}`.toLowerCase().replace(/\s/g, "").includes(term));

  return (
    <>
      <PageHeader eyebrow="Accounts" title="Credit limits" description="Available credit = limit − outstanding debt − pending charges. Every change needs a reason and is kept below." />
      <SearchInput value={search} onChange={setSearch} placeholder="Search guests" className="mb-4 max-w-sm" />
      {!rows.length ? (
        <EmptyState title="No guests found" />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link to="/finance/guests/$id" params={{ id: g.id }} className="font-semibold hover:text-primary">
                      {g.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{money(g.creditLimit)}</TableCell>
                  <TableCell className={g.exceedsLimit ? "text-right tabular-nums text-destructive" : "text-right tabular-nums"}>{money(g.outstandingDebt)}</TableCell>
                  <TableCell className="text-right text-primary tabular-nums">{money(g.availableCredit)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(g)}>
                      <Pencil className="h-3.5 w-3.5" /> Change
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
      <div className="mt-10">
        <SectionTitle title="Change history" />
        {!history.length ? (
          <EmptyState title="No limit changes yet" />
        ) : (
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="text-right">From</TableHead>
                  <TableHead className="text-right">To</TableHead>
                  <TableHead className="min-w-[200px]">Reason</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap text-sm">{dateTime(c.changedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{c.guestName}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(c.previousLimit)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{money(c.newLimit)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.reason}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{c.changedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
        )}
      </div>
      {editing && <CreditLimitDialog account={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
