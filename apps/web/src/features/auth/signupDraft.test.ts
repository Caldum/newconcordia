import { afterEach, describe, expect, it } from 'vitest';

import { clearSignupDraft, newSignupKey, readSignupDraft, saveSignupDraft } from './signupDraft';

describe('signup draft', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('keeps what the player typed for this tab, without the password', () => {
    const draft = {
      email: 'camila@ejemplo.com',
      citizenName: 'Camila Ríos',
      countryCode: 'ARG',
      signupKey: newSignupKey(),
    };
    saveSignupDraft(draft);
    expect(readSignupDraft()).toEqual(draft);
    expect(sessionStorage.getItem('concordia.signup')).not.toMatch(/password/i);
    clearSignupDraft();
    expect(readSignupDraft()).toBeNull();
  });

  it('makes long random sign-up keys and ignores damaged drafts', () => {
    expect(newSignupKey()).toMatch(/^[0-9a-f]{64}$/);
    expect(newSignupKey()).not.toBe(newSignupKey());
    sessionStorage.setItem('concordia.signup', '{"email": 1}');
    expect(readSignupDraft()).toBeNull();
    sessionStorage.setItem('concordia.signup', 'not json');
    expect(readSignupDraft()).toBeNull();
  });
});
