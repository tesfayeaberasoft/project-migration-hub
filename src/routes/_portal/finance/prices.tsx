import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/prices")({
  head: () => pageHead("Price Requests", "Price Requests — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Price Requests" />,
});
