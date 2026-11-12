import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ErrorState, LoadingBlock } from "@/components/common/States";
import { routeTree } from "./routeTree.gen";

function DefaultPending() {
  return (
    <div className="p-2">
      <LoadingBlock />
    </div>
  );
}

function DefaultError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <ErrorState
      error={error}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
    />
  );
}

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: DefaultPending,
    defaultPendingMs: 150,
    defaultErrorComponent: DefaultError,
  });

  return router;
};
