import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

const summarySchema = z.object({
  good_code: z.string(),
  best_price: z.number().int().nullable(),
  average_24h: z.number().int().nullable(),
  offers: z.number().int(),
  vat: z.number(),
  tariff: z.number(),
  /** Share of each sale that leaves the game, paid by the seller. */
  fee: z.number(),
});

const offerSchema = z.object({
  offer_id: z.number().int(),
  seller_name: z.string(),
  origin_country_code: z.string(),
  quantity: z.number().int(),
  /** Hundredths per unit, VAT included. */
  price: z.number().int(),
  imported: z.boolean(),
  tariff: z.number(),
});

const myOfferSchema = z.object({
  offer_id: z.number().int(),
  market_country_code: z.string(),
  good_code: z.string(),
  company_name: z.string().nullable(),
  quantity: z.number().int(),
  price: z.number().int(),
  sold: z.number().int(),
  created_at: z.string(),
});

const inventorySchema = z.object({ good_code: z.string(), quantity: z.number() });

export type MarketSummary = z.infer<typeof summarySchema>;
export type MarketOffer = z.infer<typeof offerSchema>;
export type MyOffer = z.infer<typeof myOfferSchema>;
export type InventoryLine = z.infer<typeof inventorySchema>;

async function rows<T>(call: PromiseLike<{ data: unknown; error: unknown }>, schema: z.ZodType<T>) {
  const { data, error } = await call;
  if (error) throw error as Error;
  return z.array(schema).parse(data);
}

function useMe() {
  const auth = useAuth();
  return {
    userId: auth.status === 'signedIn' ? auth.session.user.id : '',
    enabled: auth.status === 'signedIn',
  };
}

export function useMarketSummary(country: string) {
  return useQuery({
    queryKey: ['market', country, 'summary'],
    queryFn: () => rows(supabase.rpc('market_summary', { p_country_code: country }), summarySchema),
  });
}

export function useMarketOffers(country: string, good: string) {
  return useQuery({
    queryKey: ['market', country, 'offers', good],
    queryFn: () =>
      rows(
        supabase.rpc('list_market', { p_country_code: country, p_good_code: good }),
        offerSchema,
      ),
  });
}

export function useMyOffers() {
  const { userId, enabled } = useMe();
  return useQuery({
    queryKey: ['me', userId, 'offers'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_offers'), myOfferSchema),
  });
}

export function useMyInventory() {
  const { userId, enabled } = useMe();
  return useQuery({
    queryKey: ['me', userId, 'inventory'],
    enabled,
    queryFn: () => rows(supabase.rpc('get_my_inventory'), inventorySchema),
  });
}

/** What a purchase costs, as the database charges it: VAT is inside the price, the tariff is on top. */
export function purchaseTotals(
  price: number,
  quantity: number,
  vat: number,
  tariff: number,
  imported: boolean,
) {
  const gross = price * quantity;
  const vatPart = Math.round(gross - gross / (1 + vat));
  const tariffPart = imported ? Math.round(gross * tariff) : 0;
  return { gross, vat: vatPart, tariff: tariffPart, total: gross + tariffPart };
}

/** What a seller receives if everything sells: the gross minus the VAT and the market fee. */
export function saleTotals(price: number, quantity: number, vat: number, fee: number) {
  const gross = price * quantity;
  const vatPart = Math.round(gross - gross / (1 + vat));
  const feePart = Math.round(gross * fee);
  return { gross, vat: vatPart, fee: feePart, net: gross - vatPart - feePart };
}
