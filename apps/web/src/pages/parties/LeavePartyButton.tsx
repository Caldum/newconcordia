import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { leaveParty } from '../../features/politics/api';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Leaving the party, with what happens to its leadership. */
export function LeavePartyButton() {
  const copy = useMessages(messages);
  const leave = useGameAction(() => leaveParty(), { refreshes: [['parties']] });
  return (
    <>
      <ActionFeedback problem={leave.problem} copy={copy} />
      <div>
        <Button
          variant="ghost"
          disabled={leave.pending}
          onClick={() => {
            leave.run();
          }}
        >
          {copy.leave}
        </Button>
      </div>
      <p className={styles.muted}>{copy.leaveHint}</p>
    </>
  );
}
