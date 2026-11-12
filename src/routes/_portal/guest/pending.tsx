import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/pending")({
  head: () => pageHead("Pending Confirmation", "Pending Confirmation — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Guest" title="Pending Confirmation" />,
});
