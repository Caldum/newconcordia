import { supabase } from '../../lib/supabase';

export interface LegalVersions {
  terms: number;
  privacy: number;
}

/** Records that the player accepts the terms and the privacy policy at the versions they read. */
export function acceptLegal(versions: LegalVersions) {
  return supabase.rpc('accept_legal', {
    p_terms_version: versions.terms,
    p_privacy_version: versions.privacy,
  });
}
