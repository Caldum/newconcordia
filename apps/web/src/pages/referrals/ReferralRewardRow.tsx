import styles from '../../features/economy/economy.module.css';
import { Avatar } from '../../features/profile/Avatar';
import type { ReferralReward } from '../../features/profile/queries';
import { formatDate, formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import own from './Referrals.module.css';

/** One referral: the GOLD that counted, the referrer's share and where it stands. */
export function ReferralRewardRow({ reward }: { reward: ReferralReward }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const gold = (hundredths: number) => formatMoney(hundredths, locale);
  const date = (value: string) => formatDate(value, locale);
  const state =
    reward.status === 'earning'
      ? copy.earning(date(reward.earning_until))
      : reward.status === 'claimable'
        ? copy.claimableUntil(gold(reward.claimable), date(reward.claim_until))
        : reward.status === 'done'
          ? copy.done
          : copy.expired(date(reward.claim_until));
  return (
    <li>
      <span className={own.row}>
        <Avatar name={reward.name} path={reward.avatar_path} size={40} />
        <span>
          <strong>{reward.name}</strong>
          <br />
          <span className={styles.muted}>
            {copy.joined(date(reward.joined_at))} ·{' '}
            {copy.goldCounted(gold(reward.gold_earned), gold(reward.gold_bought))}
          </span>
          <br />
          <span className={styles.muted}>
            {copy.share(gold(reward.due), gold(reward.claimed))} · {state}
          </span>
        </span>
      </span>
    </li>
  );
}
