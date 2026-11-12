import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DatabaseBackup, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader, SectionTitle } from "@/components/common/PageHeader";
import { Panel, TableShell } from "@/components/common/Panel";
import { EmptyState, Spinner } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { downloadBlob } from "@/lib/download";
import { dateTime } from "@/lib/format";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { systemService } from "@/services/system.service";

export const Route = createFileRoute("/_portal/admin/backup")({
  head: () => pageHead("Backup & Restore", "Download a full backup of the credit records or restore one."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.backups()),
  component: BackupPage,
});

function BackupPage() {
  const { data: backups } = useSuspenseQuery(q.backups());
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; snapshot: unknown } | null>(null);

  const create = useAction(() => systemService.createBackup(), {
    success: "Backup created and downloaded.",
    onSuccess: (r) => {
      const stamp = r.backup.createdAt.slice(0, 19).replace(/[:T]/g, "-");
      downloadBlob(new Blob([JSON.stringify(r.snapshot, null, 2)], { type: "application/json" }), `haroni-dcms-backup-${stamp}.json`);
    },
  });
  const restore = useAction((snapshot: unknown) => systemService.restore(snapshot), { success: "Database restored from backup.", onSuccess: () => setPending(null) });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending({ name: file.name, snapshot: JSON.parse(await file.text()) as unknown });
    } catch {
      toast.error("That file is not a valid backup (could not read JSON).");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <PageHeader eyebrow="System" title="Backup & restore" description="Keep a copy of every guest, transaction, payment and setting. Store backup files somewhere safe." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle title="Create a backup" />
          <p className="mb-5 text-sm text-muted-foreground">Saves the complete current state and downloads it to this computer as a file.</p>
          <Button onClick={() => create.mutate(undefined)} disabled={create.isPending}>
            {create.isPending ? <Spinner className="h-4 w-4 text-current" /> : <DatabaseBackup className="h-4 w-4" />} Create & download backup
          </Button>
        </Panel>
        <Panel delay={60}>
          <SectionTitle title="Restore from a file" />
          <p className="mb-5 text-sm text-muted-foreground">Replaces all current records with the contents of a backup file. Everyone stays signed in.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="Backup file" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={restore.isPending}>
            {restore.isPending ? <Spinner className="h-4 w-4 text-current" /> : <Upload className="h-4 w-4" />} Choose backup file
          </Button>
        </Panel>
      </div>
      <div className="mt-8">
        <SectionTitle title="Backup history" />
        {backups.length === 0 ? (
          <EmptyState title="No backups yet" description="Create your first backup above." />
        ) : (
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">{dateTime(b.createdAt)}</TableCell>
                    <TableCell>{b.createdBy}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.sizeKb.toLocaleString()} KB</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(o) => !o && setPending(null)}
        title="Restore this backup?"
        description={
          <span>
            All current records will be replaced with <b>{pending?.name}</b>. This cannot be undone — create a backup first if you may need today's data.
          </span>
        }
        confirmLabel="Restore backup"
        onConfirm={() => pending && restore.mutate(pending.snapshot)}
      />
    </>
  );
}
