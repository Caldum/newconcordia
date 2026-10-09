import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectLocale, readStoredLocale, resolveLocale, storeLocale } from './detectLocale';

describe('resolveLocale', () => {
  it('prefers the stored choice', () => {
    expect(resolveLocale({ stored: 'en', preferred: ['es-AR'] })).toBe('en');
  });

  it('ignores an unsupported stored value', () => {
    expect(resolveLocale({ stored: 'fr', preferred: ['en-GB'] })).toBe('en');
  });

  it('takes the first supported browser language, ignoring region and case', () => {
    expect(resolveLocale({ stored: null, preferred: ['pt-BR', 'EN-us', 'es'] })).toBe('en');
  });

  it('falls back to Spanish', () => {
    expect(resolveLocale({ stored: null, preferred: ['de-DE', 'fr'] })).toBe('es');
    expect(resolveLocale({ stored: null, preferred: [] })).toBe('es');
  });
});

describe('locale storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('round-trips the choice', () => {
    storeLocale('en');
    expect(readStoredLocale()).toBe('en');
    expect(detectLocale()).toBe('en');
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => {
      storeLocale('en');
    }).not.toThrow();
    expect(readStoredLocale()).toBeNull();
  });
});
