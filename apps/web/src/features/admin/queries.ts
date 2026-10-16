import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
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

const roleSchema = z.enum(['admin', 'moderator']);

const teamSchema = z.object({
  email: z.string(),
  role: roleSchema,
  added_at: z.string(),
  added_by: z.string().nullable(),
  /** An older admin row whose account is a citizen: it grants nothing. */
  is_citizen: z.boolean(),
});

const staffSchema = z.object({ role: roleSchema, email: z.string() });

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

const snapshotSchema = z.object({
  game_day: z.string(),
  currency_code: z.string(),
  minted: z.number().int(),
  burned: z.number().int(),
  circulating: z.number().int(),
  held: z.number().int(),
});

const legSchema = z.object({
  kind: z.string(),
  created_at: z.string(),
  posting_kind: z.string(),
  currency_code: z.string(),
  amount: z.number().int(),
  debit: z.string(),
  credit: z.string(),
  memo: z.string().nullable(),
  compensated_by: z.number().int().nullable(),
});

const beneficiarySchema = z.enum([
  'none',
  'host_country',
  'market_country',
  'party_country',
  'citizen_country',
  'restore_country',
]);

const goldPriceSchema = z.object({
  key: z.string(),
  category: z.enum(['companies', 'politics', 'training', 'health', 'war', 'market']),
  price: z.number().int(),
  min_price: z.number().int(),
  beneficiary: beneficiarySchema,
  country_share_bp: z.number().int(),
  description: z.string(),
  updated_at: z.string(),
  updated_by: z.string().nullable(),
});

const paramSchema = z.object({
  key: z.string(),
  value: z.number(),
  description: z.string(),
  updated_at: z.string(),
  /** Changed by its own switch elsewhere in the console. */
  managed: z.boolean(),
});

const sanctionKindSchema = z.enum(['warning', 'mute', 'suspension']);
const sanctionReasonSchema = z.enum([
  'spam',
  'abuse',
  'hate',
  'cheating',
  'multi_account',
  'name',
  'other',
]);

const sanctionSchema = z.object({
  sanction_id: z.number().int(),
  citizen_name: z.string(),
  kind: sanctionKindSchema,
  reason: sanctionReasonSchema,
  note: z.string(),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
  created_by: z.string().nullable(),
  revoked_at: z.string().nullable(),
  revoked_by: z.string().nullable(),
  revoke_note: z.string().nullable(),
  active: z.boolean(),
});

const searchSchema = z.object({
  name: z.string(),
  email: z.string(),
  country_code: z.string(),
  citizen_code: z.string().nullable(),
  level: z.number().int(),
  joined_at: z.string().nullable(),
  last_sign_in_at: z.string().nullable(),
  sanction: z.enum(['mute', 'suspension']).nullable(),
  open_reports: z.number().int(),
});

const named = z.object({ id: z.number().int(), name: z.string() });

const recordSchema = z.object({
  name: z.string(),
  email: z.string(),
  email_confirmed: z.boolean(),
  signed_up_at: z.string(),
  last_sign_in_at: z.string().nullable(),
  country_code: z.string(),
  region_code: z.string().nullable(),
  citizen_code: z.string().nullable(),
  joined_at: z.string().nullable(),
  level: z.number().int(),
  experience: z.number().int(),
  strength: z.number().int(),
  health: z.number().int(),
  bio: z.string(),
  avatar_path: z.string().nullable(),
  referred_by: z.string().nullable(),
  party: named.nullable(),
  regiment: named.nullable(),
  newspaper: named.nullable(),
  companies: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      level: z.number().int(),
      region_code: z.string(),
    }),
  ),
  balances: z.array(z.object({ currency_code: z.string(), balance: z.number().int() })),
  sanctions: z.array(sanctionSchema.omit({ citizen_name: true, revoked_by: true })),
  reports: z.array(
    z.object({
      report_id: z.number().int(),
      target_kind: z.enum(['article', 'message', 'citizen']),
      target_id: z.string(),
      reason: z.string(),
      details: z.string(),
      status: z.enum(['open', 'dismissed', 'actioned']),
      created_at: z.string(),
    }),
  ),
  reports_filed: z.number().int(),
  articles: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      published_at: z.string(),
      hidden: z.boolean(),
    }),
  ),
  notes: z.array(
    z.object({
      id: z.number().int(),
      body: z.string(),
      author: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
  signals: z.array(
    z.object({
      signal_id: z.number().int(),
      kind: z.string(),
      other_name: z.string().nullable(),
      created_at: z.string(),
      reviewed: z.boolean(),
    }),
  ),
});

const overviewSchema = z.object({
  game_day: z.string(),
  citizens: z.number().int(),
  new_today: z.number().int(),
  active_24h: z.number().int(),
  waiting: z.number().int(),
  countries_in_play: z.number().int(),
  suspended: z.number().int(),
  muted: z.number().int(),
  open_reports: z.number().int(),
  open_signals: z.number().int(),
  gold_minted: z.number().int(),
  gold_burned: z.number().int(),
  gold_held: z.number().int(),
  gold_burned_today: z.number().int(),
  gold_minted_today: z.number().int(),
});

export type TransactionLeg = z.infer<typeof legSchema>;
export type EconomySnapshot = z.infer<typeof snapshotSchema>;
export type AbuseSignal = z.infer<typeof signalSchema>;
export type AdminCountry = z.infer<typeof countrySchema>;
export type AdminRegion = z.infer<typeof regionSchema>;
export type AdminLogEntry = z.infer<typeof logSchema>;
export type AdminTeamMember = z.infer<typeof teamSchema>;
export type StaffRole = z.infer<typeof roleSchema>;
export type Staff = z.infer<typeof staffSchema>;
export type GoldPrice = z.infer<typeof goldPriceSchema>;
export type BalanceParam = z.infer<typeof paramSchema>;
export type Sanction = z.infer<typeof sanctionSchema>;
export type SanctionKind = z.infer<typeof sanctionKindSchema>;
export type SanctionReason = z.infer<typeof sanctionReasonSchema>;
export type CitizenMatch = z.infer<typeof searchSchema>;
export type CitizenRecord = z.infer<typeof recordSchema>;
export type Overview = z.infer<typeof overviewSchema>;

/** Every console query lives under the signed-in account's cache. */
function useAdminKey(...parts: unknown[]) {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : '';
  return { key: ['me', userId, 'admin', ...parts], signedIn: auth.status === 'signedIn' };
}

function useAdminQuery<T>(name: string, schema: z.ZodType<T>, enabled = true) {
  const { key, signedIn } = useAdminKey(name);
  return useQuery({
    queryKey: key,
    enabled: signedIn && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(name as 'admin_list_countries');
      if (error) throw error;
      return schema.parse(data);
    },
  });
}

/** The signed-in account's staff role, or null for players (the database decides every action anyway). */
export function useStaff(enabled = true) {
  const { key, signedIn } = useAdminKey('staff');
  return useQuery({
    queryKey: key,
    enabled: signedIn && enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_staff'), staffSchema))[0] ?? null,
  });
}

/** The legs of a ledger transaction, for an admin about to compensate it. */
export function useTransactionLegs(transactionId: number) {
  const { key, signedIn } = useAdminKey('legs', transactionId);
  return useQuery({
    queryKey: key,
    enabled: signedIn && transactionId > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_transaction_legs', {
        p_transaction_id: transactionId,
      });
      if (error) throw error;
      return z.array(legSchema).parse(data);
    },
  });
}

export function useOverview() {
  return useAdminQuery('admin_overview', overviewSchema);
}

export function useEconomySnapshots(enabled: boolean) {
  return useAdminQuery('admin_economy_snapshots', z.array(snapshotSchema), enabled);
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

export function useGoldPrices(enabled: boolean) {
  return useAdminQuery('admin_list_gold_prices', z.array(goldPriceSchema), enabled);
}

export function useBalanceParams(enabled: boolean) {
  return useAdminQuery('admin_list_params', z.array(paramSchema), enabled);
}

/** Sanctions in force, or every one of them. */
export function useSanctions(activeOnly: boolean) {
  const { key, signedIn } = useAdminKey('sanctions', activeOnly);
  return useQuery({
    queryKey: key,
    enabled: signedIn,
    queryFn: () =>
      rows(supabase.rpc('admin_list_sanctions', { p_active_only: activeOnly }), sanctionSchema),
  });
}

/** Citizens whose name, email or citizen code contains the text (two characters at least). */
export function useCitizenSearch(text: string) {
  const query = text.trim();
  const { key, signedIn } = useAdminKey('citizens', query);
  return useQuery({
    queryKey: key,
    enabled: signedIn && query.length >= 2,
    queryFn: () => rows(supabase.rpc('admin_search_citizens', { p_query: query }), searchSchema),
  });
}

/** A citizen's record for moderators. */
export function useCitizenRecord(name: string) {
  const { key, signedIn } = useAdminKey('citizen', name);
  return useQuery({
    queryKey: key,
    enabled: signedIn && name !== '',
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_citizen', { p_name: name });
      if (error) throw error;
      return recordSchema.parse(data);
    },
  });
}
