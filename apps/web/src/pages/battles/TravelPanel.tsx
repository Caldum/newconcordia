import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { travel } from '../../features/war/api';
import { useTravelTerms } from '../../features/war/queries';
import { useRegionName } from '../../features/world/useNames';
import { useWorld } from '../../features/world/useWorld';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Presence: where the player is and, once travel opens, a trip to another region. */
export function TravelPanel() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const regionName = useRegionName();
  const world = useWorld();
  const terms = useTravelTerms().data ?? null;
  const selectId = useId();
  const regions = [...(world.data?.regions.values() ?? [])]
    .filter((r) => r.is_enabled && r.code !== citizen.region_code)
    .sort((a, b) => a.name.localeCompare(b.name));
  const [chosen, setChosen] = useState<string | null>(null);
  const destination = chosen ?? regions[0]?.code ?? null;
  const go = useGameAction((key, region: string) => travel(region, key), { refreshes: [['war']] });

  return (
    <Panel className={styles.panel} aria-labelledby="travel-title">
      <h2 id="travel-title" className="at-title-3">
        {copy.travelTitle}
      </h2>
      <p>{copy.travelHere(regionName(citizen.region_code))}</p>
      <p className={styles.muted}>{copy.travelHint}</p>
      {terms && !terms.enabled ? <Note tone="info">{copy.travelOff}</Note> : null}
      <ActionFeedback
        problem={go.problem}
        copy={copy}
        success={go.succeeded && go.variables ? copy.traveled(regionName(go.variables)) : null}
      />
      {terms?.enabled && destination ? (
        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            go.run(destination);
          }}
        >
          <div className={styles.field}>
            <label htmlFor={selectId} className={styles.label}>
              {copy.travelTo}
            </label>
            <select
              id={selectId}
              className={styles.select}
              value={destination}
              onChange={(event) => {
                setChosen(event.target.value);
                go.changed();
              }}
            >
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Button type="submit" disabled={go.pending}>
              {copy.travel}
            </Button>
          </div>
        </form>
      ) : null}
    </Panel>
  );
}
