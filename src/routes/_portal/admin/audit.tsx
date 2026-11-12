import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/admin/audit")({
  head: () => pageHead("Audit Logs", "Audit Logs — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Admin" title="Audit Logs" />,
});
