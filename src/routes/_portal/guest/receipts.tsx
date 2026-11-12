import { createFileRoute } from "@tanstack/react-router";
import { GuestReceipts } from "@/components/guest/GuestScreens";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/receipts")({
  head: () => pageHead("Receipts", "Download receipts for your payments to Haroni Hotel."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(q.payments()), context.queryClient.ensureQueryData(q.myAccount())]),
  component: GuestReceipts,
});
