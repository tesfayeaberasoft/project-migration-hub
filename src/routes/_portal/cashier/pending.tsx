import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/cashier/pending")({
  head: () => pageHead("Pending & Disputes", "Pending & Disputes — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Cashier" title="Pending & Disputes" />,
});
