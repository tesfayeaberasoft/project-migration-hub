import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/debt")({
  head: () => pageHead("Debt Details", "Debt Details — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Guest" title="Debt Details" />,
});
