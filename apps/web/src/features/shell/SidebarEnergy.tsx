import { EnergyIcon } from '@concordia/atlas/GameIcons';

import { useMessages } from '../../i18n';
import { useEnergy, useProfile } from '../profile/useProfile';

import { messages } from './messages';
import styles from './Sidebar.module.css';

/** Energy out of the maximum, «84/100», rising point by point between readings. */
export function SidebarEnergy() {
  const copy = useMessages(messages);
  const profile = useProfile().data;
  const energy = useEnergy(profile?.energyReading) ?? profile?.energy;
  if (!profile || energy === undefined) return null;
  const share = Math.min(1, Math.max(0, energy / profile.energy_max));
  return (
    <div className={styles.energy} title={copy.recharge(profile.energy_per_hour)}>
      <div className={styles.energyHead} aria-hidden="true">
        <span className={styles.energyLabel}>
          <EnergyIcon />
          {copy.energy}
        </span>
        <span className={styles.figure}>{`${String(energy)}/${String(profile.energy_max)}`}</span>
      </div>
      <div
        className={styles.energyTrack}
        role="meter"
        aria-label={copy.energy}
        aria-valuemin={0}
        aria-valuemax={profile.energy_max}
        aria-valuenow={energy}
        aria-valuetext={copy.energyValue(energy, profile.energy_max)}
      >
        <span style={{ width: `${String(Math.round(share * 1000) / 10)}%` }} />
      </div>
    </div>
  );
}
