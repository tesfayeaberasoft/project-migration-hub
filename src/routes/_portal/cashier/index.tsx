import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/cashier/")({
  head: () => pageHead("Cashier Dashboard", "Cashier Dashboard — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Cashier" title="Cashier Dashboard" />,
});
