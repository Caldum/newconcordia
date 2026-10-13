import { useQueries, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const jobSchema = z.object({
  company_id: z.number().int(),
  company_name: z.string(),
  good_code: z.string(),
  region_code: z.string(),
  owner_name: z.string(),
  /** Hundredths. */
  wage: z.number().int(),
  work_tax: z.number(),
  streak: z.number().int(),
  worked_today: z.boolean(),
  /** Wage of the authorized second shift a day; null without authorization. */
  second_shift_wage: z.number().int().nullable(),
  hired_at: z.string(),
  next_change_at: z.string(),
});

const shiftSchema = z.object({
  /** Paid in the job (regular, then an authorized second), or the owner's unpaid management shift. */
  kind: z.enum(['regular', 'second', 'management']),
  company_id: z.number().int(),
  company_name: z.string(),
  gross: z.number().int(),
  tax: z.number().int(),
  net: z.number().int(),
  produced: z.number(),
  good_code: z.string(),
});

const offerSchema = z.object({
  company_id: z.number().int(),
  name: z.string(),
  good_code: z.string(),
  region_code: z.string(),
  wage: z.number().int(),
  vacancies: z.number().int(),
  owner_name: z.string(),
});

const companySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  kind: z.enum(['extractor', 'manufacturer']),
  category: z.enum(['food', 'military', 'medical']),
  good_code: z.string(),
  region_code: z.string(),
  /** The host country: wages, cash and taxes are in its Credit. */
  country_code: z.string(),
  /** N1–N5; a manufacturer's quality is its level. */
  level: z.number().int(),
  shifts_per_day: z.number().int(),
  shifts_today: z.number().int(),
  /** Extractors only: 1, 1.25 … 2. */
  efficiency: z.number().nullable(),
  /** National production bonus of the host country, 0 to 0.25. */
  national_bonus: z.number(),
  wage: z.number().int(),
  vacancies: z.number().int(),
  cash: z.number().int(),
  employees: z.number().int(),
  created_at: z.string(),
  /** Hundredths of GOLD for the next level, surcharge included; null at N5. */
  next_level_gold: z.number().int().nullable(),
  next_level_civil_level: z.number().int().nullable(),
});

const employeeSchema = z.object({
  name: z.string(),
  hired_at: z.string(),
  worked_today: z.boolean(),
  streak: z.number().int(),
  second_shift_wage: z.number().int().nullable(),
});

const stockSchema = z.object({ good_code: z.string(), quantity: z.number() });

export type Job = z.infer<typeof jobSchema>;
export type Shift = z.infer<typeof shiftSchema>;
export type JobOffer = z.infer<typeof offerSchema>;
export type Company = z.infer<typeof companySchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type StockLine = z.infer<typeof stockSchema>;

/** The player's job, or null without one. */
export function useMyJob() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'job'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_job'), jobSchema))[0] ?? null,
  });
}

/** The shifts worked today, oldest first. */
export function useMyShiftsToday() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'shifts-today'],
    enabled,
    queryFn: () => rows(supabase.rpc('get_my_shifts_today'), shiftSchema),
  });
}

export function useJobOffers() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'job-offers'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_job_offers'), offerSchema),
  });
}

export function useMyCompanies() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'companies'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_companies'), companySchema),
  });
}

export function useCompanyEmployees(companyId: number) {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'companies', companyId, 'employees'],
    enabled,
    queryFn: () =>
      rows(supabase.rpc('get_company_employees', { p_company_id: companyId }), employeeSchema),
  });
}

function companyStockQuery(userId: string, enabled: boolean, companyId: number) {
  return {
    queryKey: ['me', userId, 'companies', companyId, 'stock'],
    enabled,
    queryFn: () =>
      rows(supabase.rpc('get_company_stock', { p_company_id: companyId }), stockSchema),
  };
}

export function useCompanyStock(companyId: number) {
  const { userId, enabled } = useSignedInUser();
  return useQuery(companyStockQuery(userId, enabled, companyId));
}

/** The depots of several companies, in the same order. */
export function useCompanyStocks(companyIds: readonly number[]) {
  const { userId, enabled } = useSignedInUser();
  return useQueries({ queries: companyIds.map((id) => companyStockQuery(userId, enabled, id)) });
}
