import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const balanceSchema = z.object({
  /** `GOLD`, or the country code of a Credit. */
  currency_code: z.string(),
  country_code: z.string().nullable(),
  /** Free hundredths, ready to spend. */
  balance: z.number().int(),
  /** Hundredths locked in open holds (buy orders, bills), not part of `balance`. */
  held: z.number().int(),
});

const movementSchema = z.object({
  posting_id: z.number().int(),
  created_at: z.string(),
  kind: z.string(),
  memo: z.string().nullable(),
  currency_code: z.string(),
  /** Hundredths, negative when money left the account. */
  amount: z.number().int(),
  balance_after: z.number().int(),
  counterparty_kind: z.enum(['citizen', 'company', 'treasury', 'escrow', 'issuer', 'sink']),
  /** The citizen or company; null for the rest. */
  counterparty_name: z.string().nullable(),
  counterparty_country_code: z.string().nullable(),
});

export type Balance = z.infer<typeof balanceSchema>;
export type Movement = z.infer<typeof movementSchema>;

const pageSize = 50;

/** Gold first, then the Credit of the player's country, then other Credits they hold. */
export function useBalances() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'balances'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_balances');
      if (error) throw error;
      return z.array(balanceSchema).parse(data);
    },
  });
}

/** The statement, newest first, 50 movements per page; `currency` null lists every currency. */
export function useMovements(currency: string | null) {
  const { userId, enabled } = useSignedInUser();
  return useInfiniteQuery({
    queryKey: ['me', userId, 'movements', currency],
    enabled,
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('list_my_movements', {
        ...(currency === null ? {} : { p_currency: currency }),
        ...(pageParam === null ? {} : { p_before: pageParam }),
        p_limit: pageSize,
      });
      if (error) throw error;
      return z.array(movementSchema).parse(data);
    },
    getNextPageParam: (page) =>
      page.length === pageSize ? (page[page.length - 1]?.posting_id ?? null) : null,
  });
}
