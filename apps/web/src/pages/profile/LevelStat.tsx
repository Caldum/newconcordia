import { ProgressMeter } from '@concordia/atlas/Track';

import type { Profile } from '../../features/profile/useProfile';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import { Stat } from './Stat';

/** The civil level and the experience toward the next one. */
export function LevelStat({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const span = profile.next_level_experience - profile.level_experience;
  const progress = profile.experience - profile.level_experience;
  return (
    <Stat
      label={copy.level}
      value={number(profile.level)}
      note={copy.experience(number(profile.experience), number(profile.next_level_experience))}
    >
      <ProgressMeter
        value={progress}
        max={span}
        label={copy.experienceToLevel(profile.level + 1)}
        valueText={copy.of(number(progress), number(span))}
      />
    </Stat>
  );
}
