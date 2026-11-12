import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/")({
  head: () => pageHead("Finance Dashboard", "Finance Dashboard — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Finance Dashboard" />,
});
