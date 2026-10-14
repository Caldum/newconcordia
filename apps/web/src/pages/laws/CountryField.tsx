import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useCountryName } from '../../features/world/useNames';
import { useOtherCountries } from '../../features/world/useOtherCountries';

interface CountryFieldProps {
  label: string;
  value: string;
  /** Label of an empty choice ('' as its value), when the bill allows none. */
  noneLabel?: string;
  onChange: (code: string) => void;
}

/** Another country in play, picked by name. */
export function CountryField({ label, value, noneLabel, onChange }: CountryFieldProps) {
  const countryName = useCountryName();
  const options = useOtherCountries();
  const id = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {noneLabel === undefined ? null : <option value="">{noneLabel}</option>}
        {options.map((code) => (
          <option key={code} value={code}>
            {countryName(code)}
          </option>
        ))}
      </select>
    </div>
  );
}
