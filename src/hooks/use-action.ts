import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/services/http";

/** Mutation that refreshes every cached view on success and reports errors with a toast. */
export function useAction<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: { success?: string | ((r: TResult) => string); onSuccess?: (r: TResult) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r) => {
      await qc.invalidateQueries();
      const msg = typeof opts.success === "function" ? opts.success(r) : opts.success;
      if (msg) toast.success(msg);
      opts.onSuccess?.(r);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
