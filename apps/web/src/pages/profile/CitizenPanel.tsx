import { Panel } from '@concordia/atlas/Panel';

import type { ProfileDetails } from '../../features/profile/queries';
import type { Profile } from '../../features/profile/useProfile';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { formatDate, formatNumber, useLocale, useMessages } from '../../i18n';
import { useNow } from '../../lib/useNow';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

interface CitizenPanelProps {
  profile: Profile;
  details: ProfileDetails | null | undefined;
}

/**
 * The citizen's record: where they live, their citizenship and whether it is still adapting, the day they were
 * born in Concordia, their place in their country and their number.
 */
export function CitizenPanel({ profile, details }: CitizenPanelProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const regionName = useRegionName();
  const now = useNow();
  const adapting = Date.parse(citizen.adaptation_ends_at) > now;
  const country = countryName(profile.country_code);
  return (
    <Panel className={styles.card} aria-labelledby="profile-citizen">
      <h2 id="profile-citizen" className="at-title-2">
        {copy.citizen}
      </h2>
      <dl className={styles.facts}>
        <div>
          <dt>{copy.livesIn}</dt>
          <dd className="at-place-s">{regionName(profile.region_code)}</dd>
        </div>
        <div>
          <dt>{copy.citizenship}</dt>
          <dd>{copy.citizenshipSince(country, formatDate(citizen.citizen_since, locale))}</dd>
        </div>
        <div>
          <dt>{copy.status}</dt>
          <dd>
            {adapting
              ? copy.adapting(formatDate(citizen.adaptation_ends_at, locale))
              : copy.fullCitizen}
          </dd>
        </div>
        <div>
          <dt>{copy.born}</dt>
          <dd>{formatDate(profile.joined_at, locale)}</dd>
        </div>
        {details?.national_rank && details.national_citizens ? (
          <div>
            <dt>{copy.nationalRank}</dt>
            <dd>
              {copy.place(
                formatNumber(details.national_rank, locale),
                formatNumber(details.national_citizens, locale),
                country,
              )}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{copy.number}</dt>
          <dd>{profile.citizen_code}</dd>
        </div>
      </dl>
    </Panel>
  );
}
