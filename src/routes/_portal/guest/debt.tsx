import { createFileRoute } from "@tanstack/react-router";
import { GuestDebt } from "@/components/guest/GuestScreens";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_portal/guest/debt")({
  head: () => pageHead("Debt Details", "Your outstanding balance breakdown and downloadable statement."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(q.myStatement()), context.queryClient.ensureQueryData(q.settings())]),
  component: GuestDebt,
});
