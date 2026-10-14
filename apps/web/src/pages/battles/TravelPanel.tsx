import { buttonClassName } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import styles from '../../features/economy/economy.module.css';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Presence: where the player is, why it matters for fighting, and the way to travel. */
export function TravelPanel() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const regionName = useRegionName();
  return (
    <Panel className={styles.panel} aria-labelledby="travel-title">
      <h2 id="travel-title" className="at-title-3">
        {copy.travelTitle}
      </h2>
      <p>{copy.travelHere(regionName(citizen.region_code))}</p>
      <p className={styles.muted}>{copy.travelHint}</p>
      <div>
        <Link to="/travel" className={buttonClassName({ variant: 'secondary' })}>
          {copy.travel}
        </Link>
      </div>
    </Panel>
  );
}
