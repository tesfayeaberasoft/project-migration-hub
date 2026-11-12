import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/cashier/transactions/$id")({
  head: () => pageHead("Transaction Details", "Transaction Details — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Cashier" title="Transaction Details" />,
});
