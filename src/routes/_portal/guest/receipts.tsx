import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/receipts")({
  head: () => pageHead("Receipts", "Receipts — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Guest" title="Receipts" />,
});
