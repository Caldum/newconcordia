import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { voteMotion } from '../../features/politics/api';
import type { MotionVote } from '../../features/politics/api';
import type { Motion } from '../../features/politics/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

const choices = ['yes', 'no', 'abstain'] as const;

interface MotionItemProps {
  motion: Motion;
  /** The player sits in Congress. */
  canVote: boolean;
}

/** One motion: what it asks, what it needs, the public count, and the member's vote. */
export function MotionItem({ motion, canVote }: MotionItemProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const vote = useGameAction((_, ballot: MotionVote) => voteMotion(ballot), {
    refreshes: [['government']],
  });
  const title = copy[`motion_${motion.kind}`](motion.target_name);
  const open = motion.status === 'open';

  return (
    <li>
      <span>
        <strong>{title}</strong>
        <br />
        <span className={styles.muted}>
          {copy[`motionRule_${motion.kind}`]}{' '}
          {copy.count(motion.yes, motion.no, motion.abstain, motion.members)}
        </span>
        <br />
        {motion.status === 'open'
          ? copy.closes(formatDateTime(motion.closes_at, locale))
          : copy[`status_${motion.status}`]}
        {motion.my_vote ? ` ${copy.yourVote(copy[motion.my_vote])}` : null}
        <ActionFeedback
          problem={vote.problem}
          copy={copy}
          success={vote.succeeded ? copy.voted : null}
        />
      </span>
      {canVote && open && !motion.my_vote && !vote.succeeded ? (
        <span>
          {choices.map((choice) => (
            <Button
              key={choice}
              variant="secondary"
              disabled={vote.pending}
              aria-label={copy.voteLabel(copy[choice], title)}
              onClick={() => {
                vote.run({ motionId: motion.motion_id, choice });
              }}
            >
              {copy[choice]}
            </Button>
          ))}
        </span>
      ) : null}
    </li>
  );
}
