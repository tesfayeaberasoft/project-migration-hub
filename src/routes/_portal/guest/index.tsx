import { createFileRoute } from "@tanstack/react-router";
import { GuestDashboard } from "@/components/guest/GuestScreens";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/")({
  head: () => pageHead("My Account", "Your credit balance, charges to confirm and recent activity at Haroni Hotel."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.guestDashboard()),
  component: GuestDashboard,
});
