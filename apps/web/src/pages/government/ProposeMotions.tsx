import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { proposeImpeachment, proposeRemoval } from '../../features/politics/api';
import { useMessages } from '../../i18n';

import { messages } from './messages';

type Proposal = 'impeachment' | 'president' | 'vice_president';

/** A member of Congress opens an impeachment or a removal for inactivity. */
export function ProposeMotions() {
  const copy = useMessages(messages);
  const propose = useGameAction(
    (_, proposal: Proposal) =>
      proposal === 'impeachment' ? proposeImpeachment() : proposeRemoval(proposal),
    { refreshes: [['government']] },
  );
  const button = (proposal: Proposal, label: string) => (
    <Button
      variant="secondary"
      disabled={propose.pending}
      onClick={() => {
        propose.run(proposal);
      }}
    >
      {label}
    </Button>
  );

  return (
    <>
      <h3 className="at-title-3">{copy.proposeTitle}</h3>
      <p className={styles.muted}>{copy.proposeHint}</p>
      <ActionFeedback
        problem={propose.problem}
        copy={copy}
        success={propose.succeeded ? copy.proposed : null}
      />
      <div className={styles.form}>
        {button('impeachment', copy.impeach)}
        {button('president', copy.removePresident)}
        {button('vice_president', copy.removeVice)}
      </div>
    </>
  );
}
