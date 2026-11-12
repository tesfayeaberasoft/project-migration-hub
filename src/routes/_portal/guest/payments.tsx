import { createFileRoute } from "@tanstack/react-router";
import { GuestPayments } from "@/components/guest/GuestScreens";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/payments")({
  head: () => pageHead("Payment History", "Payments recorded on your Haroni Hotel account."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(q.payments()), context.queryClient.ensureQueryData(q.myAccount())]),
  component: GuestPayments,
});
