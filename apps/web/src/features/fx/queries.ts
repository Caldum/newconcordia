import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const sideSchema = z.enum(['sell_gold', 'buy_gold']);

const summarySchema = z.object({
  currency_code: z.string(),
  /** Cheapest GOLD for sale, currency hundredths per GOLD. */
  best_sell: z.number().int().nullable(),
  /** Best price offered for GOLD. */
  best_buy: z.number().int().nullable(),
  last_price: z.number().int().nullable(),
  /** GOLD hundredths traded in 24 hours. */
  volume_24h: z.number().int(),
});

const bookSchema = z.object({
  offer_id: z.number().int(),
  side: sideSchema,
  /** A citizen's name, or the country code of a Central Bank. */
  owner_name: z.string(),
  is_central_bank: z.boolean(),
  gold_amount: z.number().int(),
  price: z.number().int(),
  mine: z.boolean(),
});

const myOfferSchema = z.object({
  offer_id: z.number().int(),
  currency_code: z.string(),
  side: sideSchema,
  gold_amount: z.number().int(),
  initial_gold_amount: z.number().int(),
  price: z.number().int(),
  status: z.enum(['open', 'partial']),
  created_at: z.string(),
});

const authorizationSchema = z.object({
  authorization_id: z.number().int(),
  company_id: z.number().int(),
  company_name: z.string(),
  currency_code: z.string(),
  amount: z.number().int(),
  authorized_by_name: z.string(),
  created_at: z.string(),
  status: z.enum(['open', 'executed', 'cancelled']),
  executed_by_name: z.string().nullable(),
  closed_at: z.string().nullable(),
});

export type FxSummary = z.infer<typeof summarySchema>;
export type FxBookOffer = z.infer<typeof bookSchema>;
export type MyFxOffer = z.infer<typeof myOfferSchema>;
export type BankAuthorization = z.infer<typeof authorizationSchema>;

export function useFxSummary() {
  return useQuery({
    queryKey: ['fx', 'summary'],
    queryFn: () => rows(supabase.rpc('fx_summary'), summarySchema),
  });
}

export function useFxBook(currency: string) {
  return useQuery({
    queryKey: ['fx', 'book', currency],
    enabled: currency !== '',
    queryFn: () => rows(supabase.rpc('fx_book', { p_currency: currency }), bookSchema),
  });
}

/** The player's open offers, or the Central Bank's when its governor asks. */
export function useMyFxOffers(centralBank: boolean) {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['fx', 'mine', userId, centralBank],
    enabled,
    queryFn: () =>
      rows(supabase.rpc('list_my_fx_offers', { p_central_bank: centralBank }), myOfferSchema),
  });
}

export function useBankAuthorizations(country: string) {
  return useQuery({
    queryKey: ['finances', country, 'authorizations'],
    queryFn: () =>
      rows(
        supabase.rpc('list_cb_authorizations', { p_country_code: country }),
        authorizationSchema,
      ),
  });
}
