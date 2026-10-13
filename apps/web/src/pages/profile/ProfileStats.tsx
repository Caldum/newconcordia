import type { Profile } from '../../features/profile/useProfile';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { EnergyStat } from './EnergyStat';
import { HealthStat } from './HealthStat';
import { LevelStat } from './LevelStat';
import { messages } from './messages';
import styles from './ProfilePage.module.css';
import { RankStat } from './RankStat';
import { Stat } from './Stat';

/** Every figure of the player: level, health, strength, rank, damage, influence and energy. */
export function ProfileStats({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const compact = (value: number) =>
    formatNumber(value, locale, { notation: 'compact', maximumFractionDigits: 2 });
  return (
    <div className={styles.stats}>
      <LevelStat profile={profile} />
      <HealthStat profile={profile} />
      <Stat label={copy.strength} value={number(profile.strength)} note={copy.strengthNote} />
      <RankStat profile={profile} />
      <Stat label={copy.damage} value={compact(profile.damage)} note={copy.damageNote} />
      <Stat label={copy.influence} value={number(profile.influence)} note={copy.influenceNote} />
      <EnergyStat profile={profile} />
    </div>
  );
}
