import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';

type RunOptions = {
  success?: string;
  successTitle?: string;
  errorFallback?: string;
  errorTitle?: string;
};

/**
 * Reusable pending-key + toast wrapper for async UI actions.
 * Pass a stable key (e.g. `delete:zam`) so one button can spin without locking others.
 */
export function useAsyncAction() {
  const toast = useToast();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isPending = useCallback(
    (key: string) => pendingKey === key,
    [pendingKey],
  );

  const run = useCallback(
    async <T,>(
      key: string,
      action: () => Promise<T>,
      options: RunOptions = {},
    ): Promise<T | undefined> => {
      setPendingKey(key);
      try {
        const result = await action();
        if (options.success) {
          toast.success(options.success, options.successTitle);
        }
        return result;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : (options.errorFallback ?? 'The action could not be completed.'),
          options.errorTitle,
        );
        return undefined;
      } finally {
        setPendingKey((current) => (current === key ? null : current));
      }
    },
    [toast],
  );

  return { pendingKey, isPending, run, busy: pendingKey !== null };
}
