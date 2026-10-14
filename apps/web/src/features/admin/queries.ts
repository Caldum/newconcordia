import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

const countrySchema = z.object({
  code: z.string(),
  name_es: z.string(),
  name_en: z.string(),
  is_active: z.boolean(),
  regions: z.number().int(),
  citizens: z.number().int(),
  waiting: z.number().int(),
  /** The state scheduled for the next day change, if any. */
  scheduled: z.boolean().nullable(),
  apply_on: z.string().nullable(),
});

const regionSchema = z.object({
  code: z.string(),
  name: z.string(),
  home_country_code: z.string(),
  owner_country_code: z.string(),
  is_enabled: z.boolean(),
  scheduled: z.boolean().nullable(),
  apply_on: z.string().nullable(),
});

const logSchema = z.object({
  id: z.number(),
  actor_name: z.string(),
  action: z.string(),
  target: z.string(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});

const teamSchema = z.object({ name: z.string(), email: z.string(), added_at: z.string() });

const signalSchema = z.object({
  signal_id: z.number().int(),
  kind: z.enum([
    'shared_ip',
    'self_trading',
    'large_transfer',
    'hold_inconsistent',
    'ledger_imbalance',
  ]),
  user_name: z.string().nullable(),
  other_name: z.string().nullable(),
  detail: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  reviewed_at: z.string().nullable(),
  review_note: z.string().nullable(),
});

export type AbuseSignal = z.infer<typeof signalSchema>;
export type AdminCountry = z.infer<typeof countrySchema>;
export type AdminRegion = z.infer<typeof regionSchema>;
export type AdminLogEntry = z.infer<typeof logSchema>;
export type AdminTeamMember = z.infer<typeof teamSchema>;

function useAdminQuery<T>(name: string, schema: z.ZodType<T>, enabled = true) {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : '';
  return useQuery({
    queryKey: ['me', userId, 'admin', name],
    enabled: auth.status === 'signedIn' && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(name as 'admin_list_countries');
      if (error) throw error;
      return schema.parse(data);
    },
  });
}

/** Whether the signed-in account administers the game (the database decides every action anyway). */
export function useIsAdmin() {
  return useAdminQuery('am_i_admin', z.boolean());
}

export function useAbuseSignals(enabled: boolean) {
  return useAdminQuery('admin_list_abuse_signals', z.array(signalSchema), enabled);
}

export function useAdminCountries(enabled: boolean) {
  return useAdminQuery('admin_list_countries', z.array(countrySchema), enabled);
}

export function useAdminRegions(enabled: boolean) {
  return useAdminQuery('admin_list_regions', z.array(regionSchema), enabled);
}

export function useAdminLog(enabled: boolean) {
  return useAdminQuery('admin_list_log', z.array(logSchema), enabled);
}

export function useAdminTeam(enabled: boolean) {
  return useAdminQuery('admin_list_team', z.array(teamSchema), enabled);
}
