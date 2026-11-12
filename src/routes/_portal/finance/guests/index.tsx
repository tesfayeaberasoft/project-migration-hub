import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { TableShell } from "@/components/common/Panel";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/States";
import { AccountStatusBadge } from "@/components/common/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/guests/")({
  head: () => pageHead("Guest Finances", "Balances, limits and available credit for every guest."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.guestAccounts()),
  component: GuestFinances,
});

function GuestFinances() {
  const { data } = useSuspenseQuery(q.guestAccounts());
  const [search, setSearch] = useState("");
  const [overOnly, setOverOnly] = useState(false);
  const term = search.toLowerCase().replace(/\s/g, "");
  const rows = data
    .filter((g) => (!overOnly || g.exceedsLimit) && `${g.fullName}${g.username}${g.phone}`.toLowerCase().replace(/\s/g, "").includes(term))
    .sort((a, b) => b.outstandingDebt - a.outstandingDebt);
  const totalDebt = rows.reduce((s, g) => s + g.outstandingDebt, 0);

  return (
    <>
      <PageHeader eyebrow="Accounts" title="Guest finances" description="Open a guest to see their full history, change their limit, or download a statement." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, username or phone" className="max-w-sm flex-1" />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={overOnly} onCheckedChange={setOverOnly} /> Only guests over their limit
        </label>
      </div>
      {!rows.length ? (
        <EmptyState title="No guests found" />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Credit limit</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link to="/finance/guests/$id" params={{ id: g.id }} className="font-semibold text-primary hover:underline">
                      {g.fullName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{g.phone}</div>
                  </TableCell>
                  <TableCell>
                    <AccountStatusBadge status={g.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(g.creditLimit)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {g.exceedsLimit && <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-destructive" />}
                    {money(g.outstandingDebt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{money(g.pendingReservations)}</TableCell>
                  <TableCell className="text-right font-semibold text-primary tabular-nums">{money(g.availableCredit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">
                  Total outstanding
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(totalDebt)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </TableShell>
      )}
    </>
  );
}
