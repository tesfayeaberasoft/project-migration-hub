import { createFileRoute } from "@tanstack/react-router";
import { GuestHistory } from "@/components/guest/GuestScreens";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/history")({
  head: () => pageHead("Transaction History", "Every charge recorded on your Haroni Hotel account."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.transactions()),
  component: GuestHistory,
});
