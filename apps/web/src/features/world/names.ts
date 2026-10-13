import type { Locale } from '../../i18n';

import type { Country } from './useWorld';

/** «Argentina» / «Spain»: a country's short name in the player's language. */
export function countryName(country: Pick<Country, 'name_es' | 'name_en'>, locale: Locale): string {
  return locale === 'es' ? country.name_es : country.name_en;
}

/** «República Argentina»: the official name, or the short one when there is none. */
export function officialCountryName(country: Country, locale: Locale): string {
  return (
    (locale === 'es' ? country.official_name_es : country.official_name_en) ??
    countryName(country, locale)
  );
}
