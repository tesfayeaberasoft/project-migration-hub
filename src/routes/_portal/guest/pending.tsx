import { createFileRoute } from "@tanstack/react-router";
import { GuestPending } from "@/components/guest/GuestScreens";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/pending")({
  head: () => pageHead("Pending Confirmation", "Confirm or dispute charges recorded by the hotel."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.transactions({ status: "pending_guest" })),
  component: GuestPending,
});
