import { EnergyIcon } from '@concordia/atlas/GameIcons';

import { useMessages } from '../../i18n';
import { foodState } from '../profile/energy';
import { useEnergy, useProfile } from '../profile/useProfile';

import { messages } from './messages';
import styles from './Sidebar.module.css';

const percent = (value: number, max: number) =>
  `${String(Math.round(Math.min(1, Math.max(0, value / max)) * 1000) / 10)}%`;

/**
 * Energy out of the maximum, «84/100». After the energy, the appetite fills toward the next meal between
 * readings: paler, and paler still when no meal is coming (ADR 0047).
 */
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
      <div
        className={styles.energyTrack}
        role="meter"
        aria-label={copy.energy}
        aria-valuemin={0}
        aria-valuemax={view.energyMax}
        aria-valuenow={view.energy}
        aria-valuetext={copy.energyValue(view.energy, view.energyMax)}
      >
        <span style={{ width: percent(view.energy, view.energyMax) }} />
        <span
          className={view.fed ? styles.appetite : `${styles.appetite} ${styles.hungry}`}
          data-fed={view.fed}
          style={{ width: percent(view.appetite, view.energyMax) }}
        />
      </div>
    </div>
  );
}
