import { Button } from '@concordia/atlas/Button';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { buildHospital } from '../../features/health/api';
import { useHospitals } from '../../features/health/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useWorld } from '../../features/world/useWorld';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Builds an N1 hospital in a region of the country that has none. */
export function BuildHospitalForm() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const world = useWorld();
  const hospitals = useHospitals(citizen.country_code);
  const selectId = useId();
  const built = new Set((hospitals.data ?? []).map((h) => h.region_code));
  const regions = [...(world.data?.regions.values() ?? [])].filter(
    (r) => r.owner_country_code === citizen.country_code && !built.has(r.code),
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const region = regions.find((r) => r.code === chosen)?.code ?? regions[0]?.code ?? null;
  const build = useGameAction((key, code: string) => buildHospital(code, key), {
    refreshes: [['health'], ['finances']],
  });

  if (regions.length === 0) return <p className={styles.muted}>{copy.noBuildable}</p>;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (region) build.run(region);
      }}
    >
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          {copy.buildRegion}
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={region ?? ''}
          onChange={(event) => {
            setChosen(event.target.value);
            build.changed();
          }}
        >
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <ActionFeedback
        problem={build.problem}
        copy={copy}
        success={build.succeeded ? copy.built : null}
      />
      <div>
        <Button type="submit" disabled={build.pending}>
          {copy.build}
        </Button>
      </div>
    </form>
  );
}
