import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { InviteLink } from '../../features/profile/InviteLink';
import { useReferralRewards } from '../../features/profile/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { ProfileTabs } from '../profile/ProfileTabs';

import { messages } from './messages';
import { ReferralRewardRow } from './ReferralRewardRow';
import { RewardsSummary } from './RewardsSummary';

/** `/referrals`: the GOLD earned from referrals, claiming it, and each referral's share and deadlines. */
export function ReferralsPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const rewards = useReferralRewards();
  return (
    <main className={styles.page}>
      <ProfileTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {rewards.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {rewards.data ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            <RewardsSummary rewards={rewards.data} />
          </div>
          <Panel className={styles.panel} aria-labelledby="referrals-list">
            <h2 id="referrals-list" className="at-title-3">
              {copy.listTitle(rewards.data.length)}
            </h2>
            <InviteLink />
            {rewards.data.length === 0 ? <p className={styles.muted}>{copy.none}</p> : null}
            <ul className={styles.recipes}>
              {rewards.data.map((reward) => (
                <ReferralRewardRow key={reward.name} reward={reward} />
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </main>
  );
}
