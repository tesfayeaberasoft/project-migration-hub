import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/admin/guests")({
  head: () => pageHead("Guest Accounts", "Guest Accounts — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Admin" title="Guest Accounts" />,
});
