/**
 * Fills the Supabase origins into the CSP of public/_headers at build time, so connect-src names the
 * exact project instead of a wildcard. Fails the build when the URL is missing or malformed.
 */
export function renderHeaders(template: string, supabaseUrl: string | undefined): string {
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is required to build the security headers.');
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error('VITE_SUPABASE_URL must use https outside local development.');
  }
  const realtime = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
  return template
    .replaceAll('{{SUPABASE_ORIGIN}}', url.origin)
    .replaceAll('{{SUPABASE_REALTIME_ORIGIN}}', realtime);
}
