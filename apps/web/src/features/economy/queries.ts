import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

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
  hired_at: z.string(),
  next_change_at: z.string(),
});

const workdaySchema = z.object({
  company_id: z.number().int(),
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
  good_code: z.string(),
  region_code: z.string(),
  level: z.number().int(),
  capacity: z.number().int(),
  wage: z.number().int(),
  vacancies: z.number().int(),
  cash: z.number().int(),
  employees: z.number().int(),
  points: z.number(),
  created_at: z.string(),
  /** Gold for the next level; null at level 3. */
  next_level_gold: z.number().int().nullable(),
  /** Gold for the next weapon quality; null for other goods or at Q5. */
  next_quality_gold: z.number().int().nullable(),
});

const employeeSchema = z.object({
  name: z.string(),
  hired_at: z.string(),
  worked_today: z.boolean(),
  streak: z.number().int(),
});

const stockSchema = z.object({ good_code: z.string(), quantity: z.number() });

export type Job = z.infer<typeof jobSchema>;
export type Workday = z.infer<typeof workdaySchema>;
export type JobOffer = z.infer<typeof offerSchema>;
export type Company = z.infer<typeof companySchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type StockLine = z.infer<typeof stockSchema>;

function useMe() {
  const auth = useAuth();
  return {
    userId: auth.status === 'signedIn' ? auth.session.user.id : '',
    enabled: auth.status === 'signedIn',
  };
}

async function rows<T>(call: PromiseLike<{ data: unknown; error: unknown }>, schema: z.ZodType<T>) {
  const { data, error } = await call;
  if (error) throw error as Error;
  return z.array(schema).parse(data);
}

/** The player's job, or null without one. */
export function useMyJob() {
  const { userId, enabled } = useMe();
  return useQuery({
    queryKey: ['me', userId, 'job'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_job'), jobSchema))[0] ?? null,
  });
}

/** Today's payslip, or null before working. */
export function useMyWorkday() {
  const { userId, enabled } = useMe();
  return useQuery({
    queryKey: ['me', userId, 'workday'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_workday'), workdaySchema))[0] ?? null,
  });
}

export function useJobOffers() {
  const { userId, enabled } = useMe();
  return useQuery({
    queryKey: ['me', userId, 'job-offers'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_job_offers'), offerSchema),
  });
}

export function useMyCompanies() {
  const { userId, enabled } = useMe();
  return useQuery({
    queryKey: ['me', userId, 'companies'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_companies'), companySchema),
  });
}

export function useCompanyEmployees(companyId: number) {
  const { userId, enabled } = useMe();
  return useQuery({
    queryKey: ['me', userId, 'companies', companyId, 'employees'],
    enabled,
    queryFn: () =>
      rows(supabase.rpc('get_company_employees', { p_company_id: companyId }), employeeSchema),
  });
}

export function useCompanyStock(companyId: number) {
  const { userId, enabled } = useMe();
  return useQuery({
    queryKey: ['me', userId, 'companies', companyId, 'stock'],
    enabled,
    queryFn: () =>
      rows(supabase.rpc('get_company_stock', { p_company_id: companyId }), stockSchema),
  });
}

/** Calls a game action and throws its database error, whose message is the stable code. */
export async function act<T = unknown>(call: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await call;
  if (error) throw error as Error;
  return data;
}

/** The stable code of a failed action, or `other`. */
export function errorCode(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && /^[a-z_]+$/.test(message) ? message : 'other';
}

/** The copy for a failed action: the catalog's `error_<code>`, or its `error_other`. */
export function problemText(copy: { error_other: string }, code: string): string {
  const text = (copy as unknown as Record<string, unknown>)[`error_${code}`];
  return typeof text === 'string' ? text : copy.error_other;
}
