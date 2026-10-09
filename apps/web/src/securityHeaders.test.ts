// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderHeaders } from '../scripts/securityHeaders';

const template = readFileSync(
  fileURLToPath(new URL('../public/_headers', import.meta.url)),
  'utf8',
);
const headersFile = renderHeaders(template, 'https://abcdefghijklmnop.supabase.co');

/** Returns the header lines that apply to the `/*` rule of a Cloudflare `_headers` file. */
function headersForAllPaths(source: string): Map<string, string> {
  const headers = new Map<string, string>();
  let inAllPathsRule = false;
  for (const line of source.split('\n')) {
    if (line.trim() === '') continue;
    if (!line.startsWith(' ')) {
      inAllPathsRule = line.trim() === '/*';
      continue;
    }
    if (!inAllPathsRule) continue;
    const separator = line.indexOf(':');
    headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }
  return headers;
}

describe('security headers', () => {
  const headers = headersForAllPaths(headersFile);
  const csp = headers.get('content-security-policy') ?? '';

  it('sets a strict CSP without unsafe sources', () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toMatch(/unsafe-(inline|eval)/);
  });

  it('enables HSTS for two years with subdomains', () => {
    expect(headers.get('strict-transport-security')).toMatch(/max-age=63072000; includeSubDomains/);
  });

  it('sets the remaining hardening headers', () => {
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('permissions-policy')).toContain('camera=()');
    expect(headers.get('cross-origin-opener-policy')).toBe('same-origin');
  });

  it('caches hashed build assets as immutable', () => {
    expect(headersFile).toMatch(
      /\/assets\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/,
    );
  });

  it('allows connections only to the configured Supabase project', () => {
    expect(csp).toContain(
      "connect-src 'self' https://abcdefghijklmnop.supabase.co wss://abcdefghijklmnop.supabase.co",
    );
    expect(csp).not.toContain('*.supabase.co');
    expect(csp).not.toContain('{{');
  });

  it('uses plain WebSockets only for local development', () => {
    expect(renderHeaders(template, 'http://127.0.0.1:54321')).toContain(
      'http://127.0.0.1:54321 ws://127.0.0.1:54321',
    );
  });

  it('refuses a missing or insecure Supabase URL', () => {
    expect(() => renderHeaders(template, undefined)).toThrow(/VITE_SUPABASE_URL is required/);
    expect(() => renderHeaders(template, 'http://example.com')).toThrow(/https/);
  });
});
