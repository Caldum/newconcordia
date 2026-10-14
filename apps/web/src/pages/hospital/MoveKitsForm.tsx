import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { moveKits } from '../../features/health/api';
import type { KitMove } from '../../features/health/api';
import { useHospitals } from '../../features/health/queries';
import { parseUnits } from '../../features/market/units';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

const kits = ['kit_q1', 'kit_q2', 'kit_q3', 'kit_q4', 'kit_q5'];
/** The ministry's store in the selects; null for the database. */
const store = 'store';

/** Moves kits at once between Health's store and the country's hospitals. */
export function MoveKitsForm() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const regionName = useRegionName();
  const goodName = useGoodName();
  const hospitals = useHospitals(citizen.country_code).data ?? [];
  const fromId = useId();
  const toId = useId();
  const kitId = useId();
  const [from, setFrom] = useState(store);
  const [to, setTo] = useState<string | null>(null);
  const [good, setGood] = useState('kit_q1');
  const [quantityText, setQuantityText] = useState('');
  const [checked, setChecked] = useState(false);
  const places = [store, ...hospitals.map((h) => h.region_code)];
  const destination = to ?? places.find((p) => p !== from) ?? store;
  const quantity = parseUnits(quantityText);
  const move = useGameAction((_, request: KitMove) => moveKits(request), {
    refreshes: [['health']],
    onSuccess: () => {
      setQuantityText('');
      setChecked(false);
    },
  });
  const placeName = (place: string) => (place === store ? copy.store : regionName(place));
  const select = (id: string, label: string, value: string, onChange: (value: string) => void) => (
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
          move.changed();
        }}
      >
        {places.map((place) => (
          <option key={place} value={place}>
            {placeName(place)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (quantity <= 0) return;
        move.run({
          from: from === store ? null : from,
          to: destination === store ? null : destination,
          good,
          quantity,
        });
      }}
    >
      <h3 className="at-title-3">{copy.moveTitle}</h3>
      {select(fromId, copy.from, from, setFrom)}
      {select(toId, copy.to, destination, setTo)}
      <div className={styles.field}>
        <label htmlFor={kitId} className={styles.label}>
          {copy.kit}
        </label>
        <select
          id={kitId}
          className={styles.select}
          value={good}
          onChange={(event) => {
            setGood(event.target.value);
            move.changed();
          }}
        >
          {kits.map((code) => (
            <option key={code} value={code}>
              {goodName(code)}
            </option>
          ))}
        </select>
      </div>
      <Field
        label={copy.quantity}
        inputMode="numeric"
        autoComplete="off"
        value={quantityText}
        error={checked && quantity <= 0 ? copy.quantityInvalid : undefined}
        onChange={(event) => {
          setQuantityText(event.target.value);
          move.changed();
        }}
      />
      <ActionFeedback
        problem={move.problem}
        copy={copy}
        success={move.succeeded ? copy.moved : null}
      />
      <div>
        <Button type="submit" disabled={move.pending}>
          {copy.move}
        </Button>
      </div>
    </form>
  );
}
