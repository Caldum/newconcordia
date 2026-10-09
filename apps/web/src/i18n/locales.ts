export const locales = ['es', 'en'] as const;

export type Locale = (typeof locales)[number];

/** Spanish is the source language of the game copy (docs/voice.md). */
export const defaultLocale: Locale = 'es';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
