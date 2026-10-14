import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { vote } from '../../features/politics/api';
import { usePartyLists } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface PartyListListProps {
  electionId: number;
  /** The player may cast their ballot now. */
  canVote: boolean;
}

/** The party lists for Congress, their candidates in order, the result once proclaimed, and voting. */
export function PartyListList({ electionId, canVote }: PartyListListProps) {
  const copy = useMessages(messages);
  const lists = usePartyLists(electionId);
  const ballot = useGameAction((_, candidacyId: number) => vote(candidacyId), {
    refreshes: [['elections']],
  });
  const rows = lists.data ?? [];

  return (
    <>
      <h3 className="at-title-3">{copy.listsTitle}</h3>
      <ActionFeedback
        problem={ballot.problem}
        copy={copy}
        success={ballot.succeeded ? copy.voteCast : null}
      />
      {lists.isSuccess && rows.length === 0 ? <p className={styles.muted}>{copy.noLists}</p> : null}
      <ul className={styles.recipes}>
        {rows.map((list) => (
          <li key={list.candidacy_id}>
            <span>
              <strong>{list.party_name}</strong>
              {list.votes === null ? null : (
                <span className={styles.muted}>
                  {' · '}
                  {copy.result(list.votes)} · {copy.seatsWon(list.seats ?? 0)}
                </span>
              )}
              <br />
              <span className={styles.muted}>{list.candidates.join(', ')}</span>
            </span>
            {canVote && !ballot.succeeded ? (
              <Button
                variant="secondary"
                disabled={ballot.pending}
                aria-label={copy.voteFor(list.party_name)}
                onClick={() => {
                  ballot.run(list.candidacy_id);
                }}
              >
                {copy.vote}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
