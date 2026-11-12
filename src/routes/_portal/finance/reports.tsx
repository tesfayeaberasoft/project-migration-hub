import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/reports")({
  head: () => pageHead("Financial Reports", "Financial Reports — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Financial Reports" />,
});
