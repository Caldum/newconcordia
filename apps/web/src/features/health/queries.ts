import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const policySchema = z.enum(['universal', 'nationals', 'non_enemies', 'allies']);

const myHospitalSchema = z.object({
  region_code: z.string(),
  level: z.number().int(),
  country_code: z.string(),
  policy: policySchema,
  eligible: z.boolean(),
});

const hospitalSchema = z.object({
  region_code: z.string(),
  level: z.number().int(),
  built_at: z.string(),
});

const careSchema = z.object({
  policy: policySchema,
  set_by_name: z.string().nullable(),
  set_at: z.string().nullable(),
});

const stockSchema = z.object({
  /** Null: Health's own store. */
  region_code: z.string().nullable(),
  good_code: z.string(),
  quantity: z.number(),
});

export type MyHospital = z.infer<typeof myHospitalSchema>;
export type Hospital = z.infer<typeof hospitalSchema>;
export type HospitalStock = z.infer<typeof stockSchema>;

export function useMyHospital() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'hospital'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_hospital'), myHospitalSchema))[0] ?? null,
  });
}

export function useHospitals(country: string) {
  return useQuery({
    queryKey: ['health', country, 'hospitals'],
    queryFn: () =>
      rows(supabase.rpc('list_hospitals', { p_country_code: country }), hospitalSchema),
  });
}

export function useCarePolicy(country: string) {
  return useQuery({
    queryKey: ['health', country, 'policy'],
    queryFn: async () =>
      (await rows(supabase.rpc('get_care_policy', { p_country_code: country }), careSchema))[0] ??
      null,
  });
}

/** Kits per hospital: only the Health minister and the president may read it. */
export function useHospitalStock() {
  return useQuery({
    queryKey: ['health', 'stock'],
    queryFn: () => rows(supabase.rpc('get_hospital_stock'), stockSchema),
  });
}
