import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/payment-history")({
  head: () => pageHead("Payment History", "Payment History — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Payment History" />,
});
