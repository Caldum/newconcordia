import { useDeferredValue, useId, useState } from 'react';

import { useRovingRadio } from '../useRovingRadio';

import styles from './CountryPicker.module.css';
import { Flag, hasFlag } from './Flag';
import { Icon } from './Icon';

/** Value of the trailing «Otro país» choice. Country codes are ISO alpha-3, so it cannot clash. */
export const otherCountry = 'other';

export interface CountryChoice {
  /** ISO 3166-1 alpha-3. */
  code: string;
  name: string;
}

interface CountryPickerProps {
  /** Group name for screen readers: «País». */
  label: string;
  countries: readonly CountryChoice[];
  value: string | null;
  onChange: (code: string) => void;
  searchLabel: string;
  /** «13 países en juego». */
  countText: string;
  /** Announced while searching: «2 países» or «Ningún país coincide con “xyz”». */
  resultsText: (count: number, query: string) => string;
  /** Label of the trailing choice that leads to the countries not in play. */
  otherLabel?: string;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Country choice at sign-up or citizenship change: search plus a grid of flags with names. */
export function CountryPicker({
  label,
  countries,
  value,
  onChange,
  searchLabel,
  countText,
  resultsText,
  otherLabel,
}: CountryPickerProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const statusId = useId();

  const visible = countries.filter((country) =>
    normalize(country.name).includes(normalize(deferredQuery)),
  );
  const items = [
    ...visible.map((country) => ({ value: country.code })),
    ...(otherLabel ? [{ value: otherCountry }] : []),
  ];
  const { onKeyDown, radioProps } = useRovingRadio(items, value, onChange);
  const searching = deferredQuery.trim() !== '';

  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <span className={styles.count}>{countText}</span>
        <input
          type="search"
          className={styles.search}
          aria-label={searchLabel}
          placeholder={searchLabel}
          aria-describedby={statusId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>
      <p id={statusId} className={searching ? styles.empty : 'at-visually-hidden'} role="status">
        {searching ? resultsText(visible.length, deferredQuery.trim()) : ''}
      </p>
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- composite widget: focus lives on its options (roving tabindex), as WAI-ARIA prescribes. */}
      <div role="radiogroup" aria-label={label} className={styles.grid} onKeyDown={onKeyDown}>
        {visible.map((country) => (
          <button
            key={country.code}
            type="button"
            className={styles.country}
            {...radioProps({ value: country.code })}
          >
            <span className={styles.flagSlot}>
              {hasFlag(country.code) ? (
                <Flag code={country.code} />
              ) : (
                <span className={styles.otherFlag} />
              )}
            </span>
            {country.name}
          </button>
        ))}
        {otherLabel ? (
          <button type="button" className={styles.country} {...radioProps({ value: otherCountry })}>
            <span className={styles.flagSlot}>
              <span className={styles.otherFlag}>
                <Icon name="globe" size={20} />
              </span>
            </span>
            {otherLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
