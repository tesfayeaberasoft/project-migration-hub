import { createFileRoute, Navigate, Outlet, redirect } from "@tanstack/react-router";
import { FullScreenLoader } from "@/components/common/States";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { readSession } from "@/services/session";

// Sessions live in the browser, so every portal page renders client-side only.
export const Route = createFileRoute("/_portal")({
  ssr: false,
  beforeLoad: () => {
    if (!readSession()) throw redirect({ to: "/" });
  },
  pendingComponent: () => <FullScreenLoader />,
  component: PortalLayout,
});

function PortalLayout() {
  const { session, hydrated } = useAuth();
  if (!hydrated) return <FullScreenLoader />;
  if (!session) return <Navigate to="/" replace />;
  return (
    <AppShell user={session.user}>
      <Outlet />
    </AppShell>
  );
}
