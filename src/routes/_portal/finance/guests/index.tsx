import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/finance/guests/")({
  head: () => pageHead("Guest Finances", "Guest Finances — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Finance" title="Guest Finances" />,
});
