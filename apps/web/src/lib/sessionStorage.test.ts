import { afterEach, describe, expect, it } from 'vitest';

import { authStorage, remembersSession, setRememberSession } from './sessionStorage';

describe('authStorage', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps the session on this computer by default', async () => {
    expect(remembersSession()).toBe(true);
    await authStorage.setItem('sb-session', 'token');
    expect(localStorage.getItem('sb-session')).toBe('token');
    expect(await authStorage.getItem('sb-session')).toBe('token');
  });

  it('keeps the session only for this browser session when asked', async () => {
    await authStorage.setItem('sb-session', 'old');
    setRememberSession(false);
    await authStorage.setItem('sb-session', 'token');
    expect(sessionStorage.getItem('sb-session')).toBe('token');
    expect(localStorage.getItem('sb-session')).toBeNull();
    await authStorage.removeItem('sb-session');
    expect(await authStorage.getItem('sb-session')).toBeNull();
  });
});
