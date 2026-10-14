import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { registerCandidacy, withdrawCandidacy } from '../../features/politics/api';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Running for leader, or withdrawing, while candidacies are open. */
export function CandidacyButton({ running }: { running: boolean }) {
  const copy = useMessages(messages);
  const toggle = useGameAction(
    (_, run: boolean) => (run ? registerCandidacy() : withdrawCandidacy()),
    { refreshes: [['parties']] },
  );
  return (
    <>
      <ActionFeedback problem={toggle.problem} copy={copy} />
      {running ? <p>{copy.running}</p> : null}
      <div>
        <Button
          variant={running ? 'ghost' : 'primary'}
          disabled={toggle.pending}
          onClick={() => {
            toggle.run(!running);
          }}
        >
          {running ? copy.withdraw : copy.run}
        </Button>
      </div>
    </>
  );
}
