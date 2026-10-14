import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { voteBill } from '../../features/politics/api';
import type { BillVote } from '../../features/politics/api';
import type { Bill } from '../../features/politics/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { BillTerms } from './BillTerms';
import { messages } from './messages';
import { TieBreakButtons } from './TieBreakButtons';

const choices = ['yes', 'no', 'abstain'] as const;

interface BillItemProps {
  bill: Bill;
  /** The player sits in Congress. */
  canVote: boolean;
  /** The player is the vice president. */
  canBreakTie: boolean;
}

/** One bill: who presented it, what it does, the public count, and the member's vote. */
export function BillItem({ bill, canVote, canBreakTie }: BillItemProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const vote = useGameAction((_, ballot: BillVote) => voteBill(ballot), {
    refreshes: [['laws']],
  });
  const open = bill.status === 'voting';
  const office = bill.proposer_office.startsWith('minister_')
    ? copy.office_minister
    : bill.proposer_office === 'president'
      ? copy.office_president
      : copy.office_congress;

  return (
    <li>
      <span>
        <strong>{bill.title}</strong> · {copy[`kind_${bill.kind}`]}
        <br />
        <span className={styles.muted}>{copy.proposedBy(bill.proposed_by_name, office)}</span>
        {bill.body ? (
          <>
            <br />
            {bill.body}
          </>
        ) : null}
        <BillTerms bill={bill} />
        <br />
        <span className={styles.muted}>
          {copy.count(bill.yes, bill.no, bill.abstain, bill.members)}
        </span>
        <br />
        {bill.status === 'voting'
          ? copy.closes(formatDateTime(bill.closes_at, locale))
          : copy[`status_${bill.status}`]}
        {bill.tiebreak ? ` ${copy.tiebreakCast(copy[bill.tiebreak])}` : null}
        {bill.my_vote ? ` ${copy.yourVote(copy[bill.my_vote])}` : null}
        <ActionFeedback
          problem={vote.problem}
          copy={copy}
          success={vote.succeeded ? copy.voted : null}
        />
      </span>
      {canVote && open && !bill.my_vote && !vote.succeeded ? (
        <span>
          {choices.map((choice) => (
            <Button
              key={choice}
              variant="secondary"
              disabled={vote.pending}
              aria-label={copy.voteLabel(copy[choice], bill.title)}
              onClick={() => {
                vote.run({ billId: bill.bill_id, choice });
              }}
            >
              {copy[choice]}
            </Button>
          ))}
        </span>
      ) : null}
      {canBreakTie && open && !bill.tiebreak ? <TieBreakButtons bill={bill} /> : null}
    </li>
  );
}
