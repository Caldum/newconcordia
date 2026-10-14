import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import { Avatar } from '../../features/profile/Avatar';
import { InviteLink } from '../../features/profile/InviteLink';
import { useReferrals } from '../../features/profile/queries';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

/** The citizens the player invited, the link to invite more and the way to the referral panel. */
export function ReferralsPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const referrals = useReferrals().data ?? [];
  return (
    <Panel className={styles.card} aria-labelledby="profile-referrals">
      <h2 id="profile-referrals" className="at-title-2">
        {copy.referrals(referrals.length)}
      </h2>
      <p className={styles.note}>{copy.referralHint}</p>
      <InviteLink />
      {referrals.length > 0 ? (
        <ul className={styles.people}>
          {referrals.slice(0, 5).map((referral) => (
            <li key={referral.name} className={styles.person}>
              <Avatar name={referral.name} path={referral.avatar_path} size={40} />
              <span className={styles.personText}>
                <span className={styles.strong}>{referral.name}</span>
                <span className={styles.note}>
                  {copy.joinedOn(formatDate(referral.joined_at, locale))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link to="/referrals">{copy.referralPanel}</Link>
    </Panel>
  );
}
