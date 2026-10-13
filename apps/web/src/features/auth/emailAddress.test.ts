import { describe, expect, it } from 'vitest';

import { looksLikeEmail } from './emailAddress';

describe('looksLikeEmail', () => {
  it('accepts an address and refuses obvious typos', () => {
    expect(looksLikeEmail('camila@example.com')).toBe(true);
    expect(looksLikeEmail('camila@example')).toBe(false);
    expect(looksLikeEmail('camila example.com')).toBe(false);
    expect(looksLikeEmail('')).toBe(false);
  });
});
