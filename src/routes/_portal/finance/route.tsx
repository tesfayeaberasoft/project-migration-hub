import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/guards";

export const Route = createFileRoute("/_portal/finance")({
  beforeLoad: () => requireRole("finance"),
  component: Outlet,
});
