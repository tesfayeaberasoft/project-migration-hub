import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/cashier/history")({
  head: () => pageHead("Transaction History", "Transaction History — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Cashier" title="Transaction History" />,
});
