import { Field } from '@concordia/atlas/Field';
import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useWorld } from '../../features/world/useWorld';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface TransferFieldsProps {
  /** The receiving country; null until the player picks one (the first in the list is shown). */
  country: string | null;
  amount: string;
  invalid: boolean;
  onCountry: (code: string) => void;
  onAmount: (text: string) => void;
}

/** Where the Gold goes (another country in play) and how much. */
export function TransferFields({
  country,
  amount,
  invalid,
  onCountry,
  onAmount,
}: TransferFieldsProps) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const world = useWorld();
  const selectId = useId();
  const options = [...(world.data?.countries.values() ?? [])]
    .filter((c) => c.is_active && c.code !== citizen.country_code)
    .map((c) => c.code)
    .sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const chosen = country !== null && options.includes(country) ? country : (options[0] ?? '');

  return (
    <>
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          {copy.country}
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={chosen}
          onChange={(event) => {
            onCountry(event.target.value);
          }}
        >
          {options.map((code) => (
            <option key={code} value={code}>
              {countryName(code)}
            </option>
          ))}
        </select>
      </div>
      <Field
        label={copy.amount}
        hint={copy.amountHint}
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        error={invalid ? copy.transferInvalid : undefined}
        onChange={(event) => {
          if (country === null && chosen) onCountry(chosen);
          onAmount(event.target.value);
        }}
      />
    </>
  );
}
