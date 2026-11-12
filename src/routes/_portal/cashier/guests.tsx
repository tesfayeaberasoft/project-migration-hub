import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { CreditSummary } from "@/components/common/CreditSummary";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/States";
import { AccountStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/cashier/guests")({
  head: () => pageHead("Guest Search", "Find a guest and check their available credit."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.guestAccounts()),
  component: GuestSearch,
});

function GuestSearch() {
  const { data: guests } = useSuspenseQuery(q.guestAccounts());
  const [search, setSearch] = useState("");
  const term = search.toLowerCase().replace(/\s/g, "");
  const list = guests.filter((g) => `${g.fullName}${g.username}${g.phone}`.toLowerCase().replace(/\s/g, "").includes(term));

  return (
    <>
      <PageHeader eyebrow="Credit desk" title="Guest search" description="Check a guest's available credit before recording services." />
      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, username or phone" className="mb-6 max-w-md" />
      {!list.length && <EmptyState title="No guests found" description="Ask the Administrator to register the guest first." />}
      <div className="grid gap-4 xl:grid-cols-2">
        {list.map((g, i) => (
          <Panel key={g.id} delay={Math.min(i, 8) * 30}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-semibold">{g.fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  @{g.username} · {g.phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AccountStatusBadge status={g.status} />
                {g.status === "active" && (
                  <Button size="sm" asChild>
                    <Link to="/cashier/new" search={{ guestId: g.id }}>
                      <PlusCircle className="h-4 w-4" /> New transaction
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <CreditSummary account={g} />
          </Panel>
        ))}
      </div>
    </>
  );
}
