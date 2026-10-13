import { Panel } from '@concordia/atlas/Panel';

import type { Profile } from '../../features/profile/useProfile';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

/** Where the player lives, since when they hold their citizenship, and their citizen number. */
export function ProfilePath({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const regionName = useRegionName();
  return (
    <Panel className={styles.path} aria-labelledby="profile-path">
      <h2 id="profile-path" className="at-title-2">
        {copy.path}
      </h2>
      <dl>
        <div>
          <dt>{copy.livesIn}</dt>
          <dd className="at-place-s">{regionName(profile.region_code)}</dd>
        </div>
        <div>
          <dt>{copy.citizenship}</dt>
          <dd>
            {copy.citizenshipSince(
              countryName(profile.country_code),
              formatDate(citizen.citizen_since, locale),
            )}
          </dd>
        </div>
        <div>
          <dt>{copy.number}</dt>
          <dd>{profile.citizen_code}</dd>
        </div>
      </dl>
    </Panel>
  );
}
