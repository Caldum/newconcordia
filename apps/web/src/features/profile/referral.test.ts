import { afterEach, describe, expect, it } from 'vitest';

import { referralLink, referrerFromSearch, rememberReferrer, takeReferrer } from './referral';

describe('referrals', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('reads the inviting citizen from the address', () => {
    expect(referrerFromSearch('?ref=Camila%20R%C3%ADos')).toBe('Camila Ríos');
    expect(referrerFromSearch('?ref=%20Ana%20')).toBe('Ana');
  });

  it('ignores a missing or implausible name', () => {
    expect(referrerFromSearch('')).toBeNull();
    expect(referrerFromSearch('?ref=ab')).toBeNull();
    expect(referrerFromSearch(`?ref=${'a'.repeat(41)}`)).toBeNull();
  });

  it('hands the stored referrer over once', () => {
    rememberReferrer('Camila Ríos');
    expect(takeReferrer()).toBe('Camila Ríos');
    expect(takeReferrer()).toBeNull();
  });

  it('builds the invitation link', () => {
    expect(referralLink('https://concordia.test', 'Camila Ríos')).toBe(
      'https://concordia.test/sign-up?ref=Camila%20R%C3%ADos',
    );
  });
});
