import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/common/NotBuiltYet";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/admin/services")({
  head: () => pageHead("Service Catalog", "Service Catalog — Haroni Hotel credit management."),
  component: () => <NotBuiltYet eyebrow="Admin" title="Service Catalog" />,
});
