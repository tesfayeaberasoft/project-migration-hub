import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/payments")({
  head: () => pageHead("Record Payment", "Record Payment — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Record Payment" />,
});
