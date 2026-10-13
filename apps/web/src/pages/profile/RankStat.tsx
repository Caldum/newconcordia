import { ProgressMeter } from '@concordia/atlas/Track';

import { rankMessages } from '../../features/profile/rankMessages';
import type { Profile } from '../../features/profile/useProfile';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import { Stat } from './Stat';

/** The military rank and the experience toward the next step; none past General V. */
export function RankStat({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const ranks = useMessages(rankMessages);
  const { locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const rankName = ranks.rankName(profile.rank_step);
  if (profile.next_rank_xp === null) {
    return (
      <Stat label={copy.rank} value={rankName} note={copy.topRank(number(profile.military_xp))} />
    );
  }
  const span = profile.next_rank_xp - profile.rank_xp;
  const progress = profile.military_xp - profile.rank_xp;
  return (
    <Stat
      label={copy.rank}
      value={rankName}
      note={copy.militaryXp(number(profile.military_xp), number(profile.next_rank_xp))}
    >
      <ProgressMeter
        value={progress}
        max={span}
        label={copy.militaryXpTo(ranks.rankName(profile.rank_step + 1))}
        valueText={copy.of(number(progress), number(span))}
      />
    </Stat>
  );
}
