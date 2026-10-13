import { ProgressMeter } from '@concordia/atlas/Track';

import type { Profile } from '../../features/profile/useProfile';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import { Stat } from './Stat';

/** Health out of its maximum; it only comes back with medical kits. */
export function HealthStat({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const health = formatNumber(profile.health, locale);
  return (
    <Stat label={copy.health} value={health} note={copy.healthNote}>
      <ProgressMeter
        value={profile.health}
        max={profile.health_max}
        label={copy.health}
        valueText={copy.of(health, formatNumber(profile.health_max, locale))}
      />
    </Stat>
  );
}
