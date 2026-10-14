import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import styles from '../../features/economy/economy.module.css';
import { useFirstSteps } from '../../features/society/queries';
import type { FirstStep } from '../../features/society/queries';
import { useMessages } from '../../i18n';

import { missionMessages } from './missionMessages';

const destinations = {
  work: '/work',
  buy: '/market',
  train: '/training',
  read: '/press',
  party: '/parties',
  fight: '/battles',
} as const satisfies Record<FirstStep['step'], string>;

/** The new citizen's first steps, each linked to where it is done; hidden once all are done. */
export function FirstStepsPanel() {
  const copy = useMessages(missionMessages);
  const steps = useFirstSteps().data ?? [];
  if (steps.length === 0 || steps.every((s) => s.done)) return null;

  return (
    <Panel className={styles.panel} aria-labelledby="first-steps-title">
      <h2 id="first-steps-title" className="at-title-3">
        {copy.firstStepsTitle}
      </h2>
      <ul className={styles.recipes}>
        {steps.map((s) => (
          <li key={s.step}>
            {s.done ? (
              <span className={styles.muted}>{copy.stepDone(copy[`step_${s.step}`])}</span>
            ) : (
              <Link to={destinations[s.step]}>{copy[`step_${s.step}`]}</Link>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
