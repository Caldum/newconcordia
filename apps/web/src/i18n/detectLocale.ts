import { defaultLocale, isLocale } from './locales';
import type { Locale } from './locales';

const storageKey = 'concordia.locale';

interface LocaleSources {
  /** The player's explicit choice, if any. */
  stored: string | null;
  /** The browser's preferred languages, most preferred first (`navigator.languages`). */
  preferred: readonly string[];
}

/** Picks the locale: the player's choice, then the first supported browser language, then Spanish. */
export function resolveLocale({ stored, preferred }: LocaleSources): Locale {
  if (isLocale(stored)) return stored;
  for (const tag of preferred) {
    const language = tag.toLowerCase().split('-')[0];
    if (isLocale(language)) return language;
  }
  return defaultLocale;
}

// Storage can be unavailable (private mode, blocked site data); the choice then lasts for the session.
export function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(storageKey, locale);
  } catch {
    // Ignored on purpose: see readStoredLocale.
  }
}

export function detectLocale(): Locale {
  return resolveLocale({ stored: readStoredLocale(), preferred: navigator.languages });
}
