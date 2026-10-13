import { EnergyMeter } from '@concordia/atlas/Track';
import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';
import { initials } from '../profile/initials';
import { useEnergy, useProfile } from '../profile/useProfile';

import styles from './GameShell.module.css';
import { messages } from './messages';

/** Energy and the way to the profile. Hidden while the profile loads or if it fails. */
export function PlayerStatus() {
  const copy = useMessages(messages);
  const profile = useProfile().data;
  const energy = useEnergy(profile?.energyReading) ?? profile?.energy;
  if (!profile || energy === undefined) return null;
  return (
    <>
      <span className={styles.chip} title={copy.recharge(profile.energy_per_hour)}>
        <EnergyMeter
          value={energy}
          max={profile.energy_max}
          label={copy.energy}
          valueText={copy.energyValue(energy, profile.energy_max)}
        />
      </span>
      <Link to="/profile" aria-label={copy.profile(profile.name)} className={styles.avatar}>
        <span aria-hidden="true">{initials(profile.name)}</span>
      </Link>
    </>
  );
}
