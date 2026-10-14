import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { Avatar } from '../../features/profile/Avatar';
import { useReferrals } from '../../features/profile/queries';
import { referralLink } from '../../features/profile/referral';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

/** The citizens the player invited, and the link to invite more. */
export function ReferralsPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const referrals = useReferrals().data ?? [];
  const [copied, setCopied] = useState(false);
  const link = referralLink(window.location.origin, citizen.name);
  return (
    <Panel className={styles.card} aria-labelledby="profile-referrals">
      <h2 id="profile-referrals" className="at-title-2">
        {copy.referrals(referrals.length)}
      </h2>
      <p className={styles.note}>{copy.referralHint}</p>
      <p className={styles.link}>{link}</p>
      <div>
        <Button
          variant="secondary"
          icon="send"
          onClick={() => {
            void navigator.clipboard.writeText(link).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? copy.copied : copy.copyLink}
        </Button>
      </div>
      {referrals.length > 0 ? (
        <ul className={styles.people}>
          {referrals.map((referral) => (
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
    </Panel>
  );
}
