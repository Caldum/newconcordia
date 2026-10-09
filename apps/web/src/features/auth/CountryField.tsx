import { CountryPicker } from '@concordia/atlas/CountryPicker';
import { Note } from '@concordia/atlas/Note';

import { defineMessages, useLocale, useMessages } from '../../i18n';
import { useWorld } from '../world/useWorld';

import styles from './CountryField.module.css';

const messages = defineMessages({
  es: {
    title: 'Elige tu país',
    label: 'País',
    search: 'Buscar país',
    count: (count: number) => `${String(count)} países en juego`,
    results: (count: number, query: string) =>
      count === 0
        ? `Ningún país coincide con «${query}».`
        : count === 1
          ? '1 país coincide.'
          : `${String(count)} países coinciden.`,
    loadFailed: 'No se pudo cargar la lista de países. Recarga la página para intentar de nuevo.',
    required: 'Elige el país donde vas a empezar.',
  },
  en: {
    title: 'Choose your country',
    label: 'Country',
    search: 'Search country',
    count: (count: number) => `${String(count)} countries in play`,
    results: (count: number, query: string) =>
      count === 0
        ? `No country matches “${query}”.`
        : count === 1
          ? '1 country matches.'
          : `${String(count)} countries match.`,
    loadFailed: 'The country list did not load. Reload the page to try again.',
    required: 'Choose the country where you start.',
  },
});

interface CountryFieldProps {
  value: string | null;
  onChange: (code: string) => void;
  showErrors: boolean;
}

/** The countries in play, from the database, with their names in the player's language. */
export function CountryField({ value, onChange, showErrors }: CountryFieldProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const world = useWorld();

  if (world.isError) return <Note tone="error">{copy.loadFailed}</Note>;

  const countries = world.data
    ? [...world.data.countries.values()]
        .filter((country) => country.is_active)
        .map((country) => ({
          code: country.code,
          name: locale === 'es' ? country.name_es : country.name_en,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, locale))
    : [];

  return (
    <fieldset className={styles.fieldset} aria-busy={world.isPending}>
      <legend className={`at-label ${styles.legend}`}>{copy.title}</legend>
      <CountryPicker
        label={copy.label}
        countries={countries}
        value={value}
        onChange={onChange}
        searchLabel={copy.search}
        countText={copy.count(countries.length)}
        resultsText={copy.results}
      />
      {showErrors && !value ? (
        <p className={`at-support ${styles.error}`} role="alert">
          {copy.required}
        </p>
      ) : null}
    </fieldset>
  );
}
