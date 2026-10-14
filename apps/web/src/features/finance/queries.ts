import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';

const institutionSchema = z.enum([
  'treasury',
  'economy',
  'defense',
  'foreign_affairs',
  'health',
  'development',
  'central_bank',
]);

const fundsSchema = z.object({
  institution: institutionSchema,
  currency_code: z.string(),
  /** Free hundredths. */
  balance: z.number().int(),
  /** Hundredths locked by bills or orders. */
  held: z.number().int(),
});

const movementSchema = z.object({
  posting_id: z.number().int(),
  created_at: z.string(),
  institution: institutionSchema,
  kind: z.string(),
  memo: z.string().nullable(),
  currency_code: z.string(),
  /** Hundredths; negative when the institution paid. */
  amount: z.number().int(),
  counterparty_kind: z.string(),
  counterparty_name: z.string().nullable(),
  ordered_by: z.string().nullable(),
});

const stockSchema = z.object({
  good_code: z.string(),
  origin_country_code: z.string(),
  quantity: z.number(),
});

export type Institution = z.infer<typeof institutionSchema>;
export type PublicFunds = z.infer<typeof fundsSchema>;
export type PublicMovement = z.infer<typeof movementSchema>;
export type StockLine = z.infer<typeof stockSchema>;

export function usePublicFinances(country: string) {
  return useQuery({
    queryKey: ['finances', country, 'funds'],
    queryFn: () =>
      rows(supabase.rpc('get_public_finances', { p_country_code: country }), fundsSchema),
  });
}

export function usePublicMovements(country: string) {
  return useQuery({
    queryKey: ['finances', country, 'movements'],
    queryFn: () =>
      rows(supabase.rpc('list_public_movements', { p_country_code: country }), movementSchema),
  });
}

/** A ministry's inventory: only its minister and the president may read it. */
export function useMinistryStock(ministry: string) {
  return useQuery({
    queryKey: ['finances', 'stock', ministry],
    queryFn: () => rows(supabase.rpc('get_ministry_stock', { p_ministry: ministry }), stockSchema),
  });
}
