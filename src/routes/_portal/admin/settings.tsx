import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useState } from "react";
import { TextField } from "@/components/common/FormDialog";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { Spinner } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { systemService } from "@/services/system.service";
import type { SystemSettings } from "@/types";

export const Route = createFileRoute("/_portal/admin/settings")({
  head: () => pageHead("System Settings", "Hotel details, confirmation deadlines and receipt settings."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.settings()),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useSuspenseQuery(q.settings());
  const [f, setF] = useState<SystemSettings>(data);
  const set = <K extends keyof SystemSettings>(k: K, v: SystemSettings[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = useAction(() => systemService.updateSettings(f), { success: "Settings saved." });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(undefined);
      }}
    >
      <PageHeader
        eyebrow="System"
        title="System settings"
        description="These details appear on receipts, statements and reports, and control confirmation rules."
        actions={
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Spinner className="h-4 w-4 text-current" /> : <Save className="h-4 w-4" />} Save settings
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle title="Hotel details" />
          <div className="space-y-4">
            <TextField id="s-name" label="Hotel name" required value={f.hotelName} onChange={(v) => set("hotelName", v)} />
            <TextField id="s-address" label="Address" value={f.hotelAddress} onChange={(v) => set("hotelAddress", v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="s-phone" label="Phone" value={f.hotelPhone} onChange={(v) => set("hotelPhone", v)} />
              <TextField id="s-email" label="Email" type="email" value={f.hotelEmail} onChange={(v) => set("hotelEmail", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="s-tin" label="TIN" value={f.hotelTin} onChange={(v) => set("hotelTin", v)} />
              <TextField id="s-cur" label="Currency" value={f.currency} onChange={(v) => set("currency", v.toUpperCase())} />
            </div>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel delay={60}>
            <SectionTitle title="Guest confirmation" />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="s-deadline"
                  label="Confirmation deadline (hours)"
                  type="number"
                  value={String(f.confirmationDeadlineHours)}
                  onChange={(v) => set("confirmationDeadlineHours", Number(v))}
                  hint="Unconfirmed transactions expire after this."
                />
                <TextField
                  id="s-reminder"
                  label="Reminder before deadline (hours)"
                  type="number"
                  value={String(f.reminderBeforeHours)}
                  onChange={(v) => set("reminderBeforeHours", Number(v))}
                />
              </div>
              <label className="flex items-center justify-between gap-4 rounded-lg border bg-surface p-4">
                <span>
                  <span className="block text-sm font-medium">SMS reminders</span>
                  <span className="block text-xs text-muted-foreground">Remind guests by SMS before a confirmation expires.</span>
                </span>
                <Switch checked={f.smsRemindersEnabled} onCheckedChange={(v) => set("smsRemindersEnabled", v)} />
              </label>
            </div>
          </Panel>
          <Panel delay={120}>
            <SectionTitle title="Finance & receipts" />
            <div className="space-y-4">
              <TextField
                id="s-target"
                label="Historical debt target (ETB)"
                type="number"
                value={String(f.historicalDebtTarget)}
                onChange={(v) => set("historicalDebtTarget", Number(v))}
                hint="Total of the old paper records being moved into the system, used for reconciliation."
              />
              <div className="space-y-2">
                <Label htmlFor="s-footer">Receipt footer</Label>
                <Textarea id="s-footer" rows={3} value={f.receiptFooter} onChange={(e) => set("receiptFooter", e.target.value)} />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
