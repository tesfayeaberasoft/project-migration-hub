import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/limits")({
  head: () => pageHead("Credit Limits", "Credit Limits — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Credit Limits" />,
});
