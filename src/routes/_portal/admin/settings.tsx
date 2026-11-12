import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/admin/settings")({
  head: () => pageHead("System Settings", "System Settings — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Admin" title="System Settings" />,
});
