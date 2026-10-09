/**
 * Where Auth email links point: this site's origin. The templates in supabase/templates add
 * /auth/confirm, so a link works even when Auth falls back to the project's site URL.
 */
export function emailRedirectTo(): string {
  return window.location.origin;
}
