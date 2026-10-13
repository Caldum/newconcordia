import { useEnergy } from '../../features/profile/useProfile';
import type { Profile } from '../../features/profile/useProfile';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import { Stat } from './Stat';

/** Energy now, rising point by point, and how it recharges. */
export function EnergyStat({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const energy = useEnergy(profile.energyReading) ?? profile.energy;
  return (
    <Stat
      label={copy.energy}
      value={formatNumber(energy, locale)}
      note={
        energy >= profile.energy_max
          ? copy.full
          : copy.recharge(profile.energy_per_hour, profile.energy_max)
      }
    />
  );
}
