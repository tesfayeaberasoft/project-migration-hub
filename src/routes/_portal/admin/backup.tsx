import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/admin/backup")({
  head: () => pageHead("Backup & Restore", "Backup & Restore — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Admin" title="Backup & Restore" />,
});
