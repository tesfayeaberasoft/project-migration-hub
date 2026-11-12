import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/exceptions")({
  head: () => pageHead("Exceptional Credit", "Exceptional Credit — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Exceptional Credit" />,
});
