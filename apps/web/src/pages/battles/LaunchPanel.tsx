import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { launchOffensive } from '../../features/war/api';
import { useLaunchTargets } from '../../features/war/queries';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The president picks a region of the enemy or of an authorized target and launches the offensive. */
export function LaunchPanel() {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const regionName = useRegionName();
  const targets = useLaunchTargets(true).data ?? [];
  const selectId = useId();
  const [chosen, setChosen] = useState<string | null>(null);
  const region =
    targets.find((t) => t.region_code === chosen)?.region_code ?? targets[0]?.region_code ?? null;
  const launch = useGameAction((key, code: string) => launchOffensive(code, key), {
    refreshes: [['war']],
  });

  return (
    <Panel className={styles.panel} aria-labelledby="launch-title">
      <h2 id="launch-title" className="at-title-3">
        {copy.launchTitle}
      </h2>
      <p className={styles.muted}>{copy.launchHint}</p>
      <ActionFeedback
        problem={launch.problem}
        copy={copy}
        success={launch.succeeded ? copy.launched : null}
      />
      {targets.length === 0 ? (
        <p className={styles.muted}>{copy.noTargets}</p>
      ) : (
        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (region) launch.run(region);
          }}
        >
          <div className={styles.field}>
            <label htmlFor={selectId} className={styles.label}>
              {copy.region}
            </label>
            <select
              id={selectId}
              className={styles.select}
              value={region ?? ''}
              onChange={(event) => {
                setChosen(event.target.value);
                launch.changed();
              }}
            >
              {targets.map((t) => (
                <option key={t.region_code} value={t.region_code}>
                  {copy.targetLine(
                    regionName(t.region_code),
                    countryName(t.country_code),
                    t.needs_authorization,
                  )}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Button type="submit" disabled={launch.pending}>
              {copy.launch}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}
