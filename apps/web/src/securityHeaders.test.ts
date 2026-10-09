// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const headersFile = readFileSync(
  fileURLToPath(new URL('../public/_headers', import.meta.url)),
  'utf8',
);

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
});
