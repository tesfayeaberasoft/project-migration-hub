import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/transactions/$id")({
  head: () => pageHead("Transaction Details", "Transaction Details — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Transaction Details" />,
});
