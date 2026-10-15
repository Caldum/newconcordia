import { foodState } from '../../features/profile/energy';
import { useEnergy } from '../../features/profile/useProfile';
import type { Profile } from '../../features/profile/useProfile';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import { Stat } from './Stat';

/** Energy now and whether food is filling it (ADR 0047). */
export function EnergyStat({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const view = useEnergy(profile.energyReading);
  const energy = view?.energy ?? profile.energy;
  const state = view ? foodState(profile.energyReading, view) : 'full';
  return (
    <Stat
      label={copy.energy}
      value={formatNumber(energy, locale)}
      note={copy[`food_${state}` as const](
        profile.food_energy_per_interval,
        profile.food_interval_minutes,
        profile.next_meal_energy ?? 0,
      )}
    />
  );
}
