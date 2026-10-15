import { EnergyIcon } from '@concordia/atlas/GameIcons';

import { useMessages } from '../../i18n';
import { foodState } from '../profile/energy';
import { useEnergy, useProfile } from '../profile/useProfile';

import { EnergyMeter } from './EnergyMeter';
import { messages } from './messages';
import styles from './Sidebar.module.css';

/** Energy out of the maximum, «84/100», with the appetite filling toward the next meal between readings. */
export function SidebarEnergy() {
  const copy = useMessages(messages);
  const profile = useProfile().data;
  const view = useEnergy(profile?.energyReading);
  if (!profile || !view) return null;
  const state = foodState(profile.energyReading, view);
  return (
    <div
      className={styles.energy}
      title={copy[`food_${state}` as const](
        profile.energyReading.perInterval,
        profile.food_interval_minutes,
        profile.next_meal_energy ?? 0,
      )}
    >
      <div className={styles.energyHead} aria-hidden="true">
        <span className={styles.energyLabel}>
          <EnergyIcon />
          {copy.energy}
        </span>
        <span className={styles.figure}>{`${String(view.energy)}/${String(view.energyMax)}`}</span>
      </div>
      <EnergyMeter
        view={view}
        label={copy.energy}
        valueText={copy.energyValue(view.energy, view.energyMax)}
      />
    </div>
  );
}
