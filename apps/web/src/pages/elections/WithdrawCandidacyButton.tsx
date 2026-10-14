import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { withdrawPartyCandidacy } from '../../features/politics/api';
import type { ElectionKind } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The party leader withdraws the party's ticket or list; the fee stays paid. */
export function WithdrawCandidacyButton({ kind }: { kind: ElectionKind }) {
  const copy = useMessages(messages);
  const withdraw = useGameAction(() => withdrawPartyCandidacy(kind), {
    refreshes: [['elections']],
  });
  return (
    <>
      <ActionFeedback
        problem={withdraw.problem}
        copy={copy}
        success={withdraw.succeeded ? copy.withdrawn : null}
      />
      <div>
        <Button
          variant="ghost"
          disabled={withdraw.pending}
          onClick={() => {
            withdraw.run();
          }}
        >
          {copy.withdraw}
        </Button>
      </div>
    </>
  );
}
