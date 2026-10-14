import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const statusSchema = z.object({
  document: z.enum(['terms', 'privacy']),
  /** The version in force. */
  version: z.number().int(),
  accepted: z.boolean(),
});

const versionsSchema = z.object({
  terms_version: z.number().int(),
  privacy_version: z.number().int(),
});

export type LegalStatus = z.infer<typeof statusSchema>;

/** Whether the player accepted the terms and the privacy policy in force. */
export function useLegalStatus() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'legal'],
    enabled,
    queryFn: () => rows(supabase.rpc('get_my_legal_status'), statusSchema),
  });
}

/** The versions in force, for the public pages. */
export function useLegalVersions() {
  return useQuery({
    queryKey: ['legal-versions'],
    queryFn: async () =>
      (await rows(supabase.rpc('get_legal_versions'), versionsSchema))[0] ?? null,
  });
}
