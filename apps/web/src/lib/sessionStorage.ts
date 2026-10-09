import type { SupportedStorage } from '@supabase/supabase-js';

const rememberKey = 'concordia.session.remember';

function safely<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    // Storage can be blocked (private mode, disabled site data). Signing in still works for the tab.
    return fallback;
  }
}

/** «Mantener la sesión en este equipo». Remembering is the default. */
export function remembersSession(): boolean {
  return safely(() => localStorage.getItem(rememberKey) !== 'false', true);
}

export function setRememberSession(remember: boolean): void {
  safely(() => {
    localStorage.setItem(rememberKey, String(remember));
  }, undefined);
}

/**
 * Where Supabase keeps the session: local storage when the player wants to stay signed in on this
 * computer, session storage (gone when the browser closes) when not.
 */
export const authStorage: SupportedStorage = {
  getItem: (key) => safely(() => sessionStorage.getItem(key) ?? localStorage.getItem(key), null),
  setItem: (key, value) => {
    safely(() => {
      const [keep, drop] = remembersSession()
        ? [localStorage, sessionStorage]
        : [sessionStorage, localStorage];
      keep.setItem(key, value);
      drop.removeItem(key);
    }, undefined);
  },
  removeItem: (key) => {
    safely(() => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }, undefined);
  },
};
