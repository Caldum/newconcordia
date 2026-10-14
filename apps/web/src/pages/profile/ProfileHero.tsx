import { Link } from '@tanstack/react-router';

import { Avatar } from '../../features/profile/Avatar';
import type { ProfileDetails } from '../../features/profile/queries';
import { rankMessages } from '../../features/profile/rankMessages';
import type { Profile } from '../../features/profile/useProfile';
import { useCountryName } from '../../features/world/useNames';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

interface ProfileHeroProps {
  profile: Profile;
  details: ProfileDetails | null | undefined;
}

/** The player's picture, name and level, with their country, rank, day they joined and description. */
export function ProfileHero({ profile, details }: ProfileHeroProps) {
  const copy = useMessages(messages);
  const ranks = useMessages(rankMessages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <Avatar name={profile.name} path={details?.avatar_path} size={112} />
        <div className={styles.identity}>
          <h1 className="at-display">{profile.name}</h1>
          <ul className={styles.tags}>
            <li className={styles.levelTag}>{copy.levelTag(profile.level)}</li>
            <li className={styles.countryTag}>
              <span className="at-place-s">{countryName(profile.country_code)}</span>
            </li>
            <li>{ranks.rankName(profile.rank_step)}</li>
            <li>{copy.playingSince(formatDate(profile.joined_at, locale))}</li>
          </ul>
          {details?.bio ? <p className={styles.bio}>{details.bio}</p> : null}
        </div>
        <Link to="/profile/edit" className={styles.editLink}>
          {copy.editProfile}
        </Link>
      </div>
    </section>
  );
}
