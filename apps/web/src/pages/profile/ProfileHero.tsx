import { initials } from '../../features/profile/initials';
import { rankMessages } from '../../features/profile/rankMessages';
import type { Profile } from '../../features/profile/useProfile';
import { useCountryName } from '../../features/world/useNames';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

/** The player's name with their country, rank and the day they joined. */
export function ProfileHero({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const ranks = useMessages(rankMessages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(profile.name)}
        </span>
        <div className={styles.identity}>
          <h1 className="at-display">{profile.name}</h1>
          <ul className={styles.tags}>
            <li className={styles.countryTag}>
              <span className="at-place-s">{countryName(profile.country_code)}</span>
            </li>
            <li>{ranks.rankName(profile.rank_step)}</li>
            <li>{copy.playingSince(formatDate(profile.joined_at, locale))}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
