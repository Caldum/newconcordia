import { supabase } from '../../lib/supabase';

// Citizenship actions: waitlists, requests to change country and their review.

export function leaveWaitlist() {
  return supabase.rpc('leave_waitlist');
}

/** Asks for another country's citizenship; approved at once where its law is automatic. */
export function requestCitizenship(countryCode: string) {
  return supabase.rpc('request_citizenship', { p_country_code: countryCode });
}

export function cancelCitizenshipRequest() {
  return supabase.rpc('cancel_citizenship_request');
}

/** For the president and the Interior minister. */
export function decideCitizenshipRequest(requestId: number, approve: boolean) {
  return supabase.rpc('decide_citizenship_request', {
    p_request_id: requestId,
    p_approve: approve,
  });
}
