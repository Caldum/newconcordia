import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

const balanceSchema = z.object({
  /** `GOLD`, or the country code of a Credit. */
  currency_code: z.string(),
  country_code: z.string().nullable(),
  /** Hundredths. */
  balance: z.number().int(),
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
  counterparty_kind: z.enum(['citizen', 'treasury', 'issuer', 'sink']),
  counterparty_name: z.string().nullable(),
  counterparty_country_code: z.string().nullable(),
});

export type Balance = z.infer<typeof balanceSchema>;
export type Movement = z.infer<typeof movementSchema>;

const pageSize = 50;

function useUserId() {
  const auth = useAuth();
  return {
    userId: auth.status === 'signedIn' ? auth.session.user.id : '',
    signedIn: auth.status === 'signedIn',
  };
}

/** Gold first, then the Credit of the player's country, then other Credits they hold. */
export function useBalances() {
  const { userId, signedIn } = useUserId();
  return useQuery({
    queryKey: ['me', userId, 'balances'],
    enabled: signedIn,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_balances');
      if (error) throw error;
      return z.array(balanceSchema).parse(data);
    },
  });
}

/** The statement, newest first, 50 movements per page; `currency` null lists every currency. */
export function useMovements(currency: string | null) {
  const { userId, signedIn } = useUserId();
  return useInfiniteQuery({
    queryKey: ['me', userId, 'movements', currency],
    enabled: signedIn,
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

export interface TransferRequest {
  toName: string;
  currency: string;
  /** Hundredths. */
  amount: number;
  memo: string;
  /** The same key for retries of the same request, so it is never paid twice. */
  key: string;
}

/** Sends money to another citizen. Resolves with the sender's balance; rejects with the database error. */
export async function transferMoney(request: TransferRequest): Promise<number> {
  const { data, error } = await supabase.rpc('transfer_money', {
    p_to_name: request.toName,
    p_currency: request.currency,
    p_amount: request.amount,
    p_memo: request.memo,
    p_key: request.key,
  });
  if (error) throw error;
  return z.number().int().parse(data);
}
