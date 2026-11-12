import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/cashier/new")({
  head: () => pageHead("New Transaction", "New Transaction — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Cashier" title="New Transaction" />,
});
