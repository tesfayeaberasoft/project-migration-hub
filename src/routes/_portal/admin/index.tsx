import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Shield, Tags, UserCog, Users, Wallet } from "lucide-react";
import { AuditList } from "@/components/common/AuditList";
import { ActivityChart } from "@/components/common/Charts";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/admin/")({
  head: () => pageHead("Admin Dashboard", "System overview for the Haroni Hotel administrator."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.adminDashboard()),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: d } = useSuspenseQuery(q.adminDashboard());
  return (
    <>
      <PageHeader
        eyebrow="System administration"
        title="Admin dashboard"
        description="Accounts, catalog and system activity at a glance."
        actions={
          <>
            <Button asChild variant="gold">
              <Link to="/admin/guests">Register guest</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/users">Add staff user</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Registered guests" value={d.totalGuests} hint={`${d.activeGuests} active accounts`} icon={Users} highlight />
        <StatCard label="System users" value={d.totalUsers} hint={`${d.admins} administrator${d.admins === 1 ? "" : "s"}`} icon={UserCog} tone="info" delay={40} />
        <StatCard label="Cashiers" value={d.cashiers} icon={Wallet} tone="success" delay={80} />
        <StatCard label="Finance managers" value={d.financeManagers} icon={Shield} tone="warning" delay={120} />
        <StatCard label="Registered transactions" value={d.totalTransactions} icon={ClipboardList} delay={160} />
        <StatCard label="Catalog services" value={d.services} icon={Tags} tone="muted" delay={200} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel delay={120}>
          <SectionTitle title="System activity · last 14 days" />
          <ActivityChart data={d.activity} />
        </Panel>
        <Panel delay={160}>
          <SectionTitle
            title="Recent activity"
            action={
              <Button asChild variant="link" size="sm">
                <Link to="/admin/audit">All audit logs</Link>
              </Button>
            }
          />
          <AuditList items={d.recentAudit} />
        </Panel>
      </div>
    </>
  );
}
