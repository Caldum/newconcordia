import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { claimReferralRewards } from '../../features/profile/api';
import type { ReferralReward } from '../../features/profile/queries';
import { formatDate, formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The totals of every referral and claiming what is claimable now. */
export function RewardsSummary({ rewards }: { rewards: readonly ReferralReward[] }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const claim = useGameAction(() => claimReferralRewards());
  const gold = (hundredths: number) => formatMoney(hundredths, locale);
  const claimable = rewards.reduce((sum, r) => sum + r.claimable, 0);
  const due = rewards.reduce((sum, r) => sum + r.due, 0);
  const claimed = rewards.reduce((sum, r) => sum + r.claimed, 0);
  const nextExpiry = rewards
    .filter((r) => r.claimable > 0)
    .map((r) => r.claim_until)
    .sort()[0];
  return (
    <Panel className={styles.panel} aria-labelledby="referrals-summary">
      <h2 id="referrals-summary" className="at-title-3">
        {copy.summaryTitle}
      </h2>
      <dl className={styles.facts}>
        <div>
          <dt>{copy.claimable}</dt>
          <dd>{gold(claimable)}</dd>
        </div>
        <div>
          <dt>{copy.earned}</dt>
          <dd>{gold(due)}</dd>
        </div>
        <div>
          <dt>{copy.claimed}</dt>
          <dd>{gold(claimed)}</dd>
        </div>
      </dl>
      {nextExpiry ? (
        <p className={styles.muted}>{copy.nextExpiry(formatDate(nextExpiry, locale))}</p>
      ) : null}
      <ActionFeedback
        problem={claim.problem}
        copy={copy}
        success={
          claim.succeeded && typeof claim.result === 'number'
            ? copy.claimedNow(gold(claim.result))
            : null
        }
      />
      {claimable > 0 ? (
        <div>
          <Button
            disabled={claim.pending}
            onClick={() => {
              claim.run();
            }}
          >
            {copy.claim(gold(claimable))}
          </Button>
        </div>
      ) : (
        <p className={styles.muted}>{copy.nothing}</p>
      )}
    </Panel>
  );
}
