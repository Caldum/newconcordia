import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

import { act, errorCode } from './gameErrors';
import { useActionKey } from './useActionKey';

interface GameActionOptions<Variables, Result> {
  /** Queries to refresh after the action, besides the player's own data (`['me']`). */
  refreshes?: readonly QueryKey[];
  /** Runs once the database accepted the action. */
  onSuccess?: (result: Result, variables: Variables) => void;
}

/**
 * A game action the player triggers. It owns the idempotency key (kept while retrying the same request,
 * renewed after success or when the request changes), turns a refusal into its stable code and refreshes
 * the player's data afterwards. `perform(key, variables)` only calls the database (a function of a
 * feature's `api.ts`); actions without variables are written `(key) => …`.
 */
export function useGameAction<Variables = void, Result = unknown>(
  perform: (key: string, variables: Variables) => PromiseLike<{ data: Result; error: unknown }>,
  { refreshes = [], onSuccess }: GameActionOptions<Variables, Result> = {},
) {
  const queryClient = useQueryClient();
  const [key, renewKey] = useActionKey();
  const mutation = useMutation({
    mutationFn: (variables: Variables) => act(perform(key, variables)),
    onSuccess: (result, variables) => {
      renewKey();
      onSuccess?.(result, variables);
    },
    onSettled: () =>
      Promise.all(
        [['me'], ...refreshes].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });

  return {
    run: mutation.mutate,
    pending: mutation.isPending,
    /** The stable code of the last refusal, or null. */
    problem: mutation.isError ? errorCode(mutation.error) : null,
    /** What the database returned, once accepted. */
    result: mutation.isSuccess ? mutation.data : undefined,
    succeeded: mutation.isSuccess,
    /** What the last run was asked to do. */
    variables: mutation.variables,
    /** The request changed: a new key, and the last outcome no longer applies. */
    changed: () => {
      renewKey();
      mutation.reset();
    },
  };
}

export type GameAction<Variables = void, Result = unknown> = ReturnType<
  typeof useGameAction<Variables, Result>
>;
