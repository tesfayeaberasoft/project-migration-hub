import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/cashier/guests")({
  head: () => pageHead("Guest Search", "Guest Search — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Cashier" title="Guest Search" />,
});
