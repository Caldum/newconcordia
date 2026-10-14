import { supabase } from '../../lib/supabase';

export type ReportKind = 'article' | 'message' | 'citizen';
export type ReportReason = 'spam' | 'abuse' | 'hate' | 'cheating' | 'other';

export interface NewReport {
  kind: ReportKind;
  /** An article or message id, or a citizen's name. */
  target: string;
  reason: ReportReason;
  details: string;
}

export function reportContent(report: NewReport) {
  return supabase.rpc('report_content', {
    p_kind: report.kind,
    p_target: report.target,
    p_reason: report.reason,
    p_details: report.details,
  });
}

/** Moderation: dismiss a report or hide what it reports; the database checks the admin and logs it. */
export function resolveReport(reportId: number, action: 'dismiss' | 'hide', note: string) {
  return supabase.rpc('admin_resolve_report', {
    p_report_id: reportId,
    p_action: action,
    p_note: note,
  });
}

export function unhideContent(kind: 'article' | 'message', target: string) {
  return supabase.rpc('admin_unhide', { p_kind: kind, p_target: target });
}

export function inviteToBeta(email: string, note: string) {
  return supabase.rpc('admin_invite_beta', { p_email: email, p_note: note });
}

export function revokeBetaInvite(email: string) {
  return supabase.rpc('admin_revoke_beta_invite', { p_email: email });
}

export function setClosedBeta(closed: boolean) {
  return supabase.rpc('admin_set_closed_beta', { p_closed: closed });
}
