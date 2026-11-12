import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/guards";

export const Route = createFileRoute("/_portal/guest")({
  beforeLoad: () => requireRole("guest"),
  component: Outlet,
});
