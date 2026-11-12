import { redirect } from "@tanstack/react-router";
import { ROLE_HOME } from "@/hooks/use-auth";
import { readSession } from "@/services/session";
import type { Role } from "@/types";

/**
 * Route-level gate for a portal. This only decides which screens to show;
 * the API (PHP backend or demo backend) enforces the same role on every request.
 */
export function requireRole(role: Role) {
  const session = readSession();
  if (!session) throw redirect({ to: "/" });
  if (session.user.role !== role) throw redirect({ to: ROLE_HOME[session.user.role] });
  return { session };
}
