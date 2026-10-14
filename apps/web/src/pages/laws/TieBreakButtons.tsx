import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { breakTie } from '../../features/politics/api';
import type { TieBreak } from '../../features/politics/api';
import type { Bill } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

const choices = ['yes', 'no'] as const;

/** The vice president's vote on a bill, counted only if the count ends tied. */
export function TieBreakButtons({ bill }: { bill: Bill }) {
  const copy = useMessages(messages);
  const tie = useGameAction((_, choice: TieBreak) => breakTie(choice), {
    refreshes: [['laws']],
  });

  return (
    <span>
      <span className={styles.muted}>{copy.tieHint}</span>
      {tie.succeeded
        ? null
        : choices.map((choice) => (
            <Button
              key={choice}
              variant="secondary"
              disabled={tie.pending}
              aria-label={copy.tieLabel(copy[choice], bill.title)}
              onClick={() => {
                tie.run({ billId: bill.bill_id, choice });
              }}
            >
              {copy[choice]}
            </Button>
          ))}
      <ActionFeedback
        problem={tie.problem}
        copy={copy}
        success={tie.succeeded ? copy.tieCast : null}
      />
    </span>
  );
}
