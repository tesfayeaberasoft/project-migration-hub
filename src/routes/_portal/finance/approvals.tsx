import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/approvals")({
  head: () => pageHead("Transaction Approvals", "Transaction Approvals — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Transaction Approvals" />,
});
