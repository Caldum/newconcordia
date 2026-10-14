import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { leaveOffice } from '../../features/politics/api';
import type { MyOffice } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { useOfficeName } from './useOfficeName';

/** The player's own office and leaving it: at once, or through Congress for the executive. */
export function MyOfficePanel({ office }: { office: MyOffice['office'] }) {
  const copy = useMessages(messages);
  const officeName = useOfficeName();
  const executive = office === 'president' || office === 'vice_president';
  const leave = useGameAction(() => leaveOffice(executive), {
    refreshes: [['government'], ['elections']],
  });

  return (
    <Panel className={styles.panel} aria-labelledby="my-office-title">
      <h2 id="my-office-title" className="at-title-3">
        {copy.myOfficeTitle}
      </h2>
      <p>{copy.myOffice(officeName(office))}</p>
      <p className={styles.muted}>{executive ? copy.executiveHint : copy.resignHint}</p>
      <ActionFeedback
        problem={leave.problem}
        copy={copy}
        success={leave.succeeded ? (executive ? copy.resignationAsked : copy.resigned) : null}
      />
      <div>
        <Button
          variant="ghost"
          disabled={leave.pending || leave.succeeded}
          onClick={() => {
            leave.run();
          }}
        >
          {executive ? copy.askResignation : copy.resign}
        </Button>
      </div>
    </Panel>
  );
}
