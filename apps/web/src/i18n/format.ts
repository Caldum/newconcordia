import type { Locale } from './locales';

// Plain `es` matches Atlas: «1.840,50» and «58 %». Latin American tags print «1,840.50» and «58%».
const intlLocale: Record<Locale, string> = { es: 'es', en: 'en-US' };

/**
 * Formats a number for the interface. Grouping is forced so that Spanish shows «1.840» (Intl's
 * Spanish locales skip the separator on four-digit numbers by default).
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options: Omit<Intl.NumberFormatOptions, 'useGrouping'> = {},
): string {
  return new Intl.NumberFormat(intlLocale[locale], { ...options, useGrouping: 'always' }).format(
    value,
  );
}

/** Formats a ratio (0.58) as a percentage with a non-breaking space where the locale uses one. */
export function formatPercent(ratio: number, locale: Locale, maximumFractionDigits = 0): string {
  return formatNumber(ratio, locale, { style: 'percent', maximumFractionDigits });
}

/** Picks the plural category for a count with the locale's rules. */
export function pluralCategory(count: number, locale: Locale): Intl.LDMLPluralRule {
  return new Intl.PluralRules(intlLocale[locale]).select(count);
}

/** Dates are shown on game time (GMT−3), the clock every player shares. */
const gameTimeZone = 'America/Argentina/Buenos_Aires';

/** «8 de octubre de 2026» / «October 8, 2026». */
export function formatDate(value: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: 'long',
    timeZone: gameTimeZone,
  }).format(new Date(value));
}

/** «8 de octubre, 15:00» / «October 8, 3:00 PM». */
export function formatDateTime(value: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: gameTimeZone,
  }).format(new Date(value));
}
