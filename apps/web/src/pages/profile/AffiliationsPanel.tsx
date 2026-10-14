import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import { Avatar } from '../../features/profile/Avatar';
import type { ProfileDetails } from '../../features/profile/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

/** The party and the regiment the player belongs to, each with its picture. */
export function AffiliationsPanel({ details }: { details: ProfileDetails | null | undefined }) {
  const copy = useMessages(messages);
  return (
    <Panel className={styles.card} aria-labelledby="profile-affiliations">
      <h2 id="profile-affiliations" className="at-title-2">
        {copy.affiliations}
      </h2>
      <div className={styles.affiliation}>
        <Avatar
          name={details?.party_name ?? copy.party}
          path={details?.party_emblem_path}
          size={56}
        />
        <div>
          <p className={styles.label}>{copy.party}</p>
          {details?.party_name ? (
            <Link to="/parties" className={styles.strong}>
              {details.party_name}
            </Link>
          ) : (
            <Link to="/parties">{copy.noParty}</Link>
          )}
        </div>
      </div>
      <div className={styles.affiliation}>
        <Avatar
          name={details?.regiment_name ?? copy.regiment}
          path={details?.regiment_emblem_path}
          size={56}
        />
        <div>
          <p className={styles.label}>{copy.regiment}</p>
          {details?.regiment_name ? (
            <Link to="/regiments" className={styles.strong}>
              {details.regiment_name}
            </Link>
          ) : (
            <Link to="/regiments">{copy.noRegiment}</Link>
          )}
        </div>
      </div>
    </Panel>
  );
}
