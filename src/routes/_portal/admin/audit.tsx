import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { TableShell } from "@/components/common/Panel";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABEL } from "@/hooks/use-auth";
import { dateTime } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import type { AuditLog } from "@/types";

export const Route = createFileRoute("/_portal/admin/audit")({
  head: () => pageHead("Audit Logs", "Every sign-in, approval, payment and change recorded in the system."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.auditLogs()),
  component: AuditPage,
});

const CATEGORIES: AuditLog["category"][] = ["auth", "transaction", "payment", "user", "guest", "settings", "catalog", "credit", "historical", "backup"];

function AuditPage() {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const query = useQuery({ ...q.auditLogs(category, search.trim()), placeholderData: (p) => p });

  return (
    <>
      <PageHeader eyebrow="System" title="Audit logs" description="A permanent record of who did what and when. Showing the latest 300 entries." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search person, action or details" className="max-w-sm flex-1" />
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full bg-surface capitalize sm:w-48" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c === "auth" ? "Sign-in" : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data ? (
        <LoadingBlock />
      ) : query.data.length === 0 ? (
        <EmptyState title="No matching entries" />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="min-w-[220px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-sm">{dateTime(a.at)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium">{a.actor}</div>
                    <div className="text-xs text-muted-foreground">{a.role === "system" ? "System" : ROLE_LABEL[a.role]}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted" className="capitalize">
                      {a.category === "auth" ? "Sign-in" : a.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{a.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.details ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </>
  );
}
