import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { vote } from '../../features/politics/api';
import { useCandidates } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface CandidateListProps {
  electionId: number;
  /** The player may cast their ballot now. */
  canVote: boolean;
}

/** The candidates of an election, by seniority, with a vote button each while the player may vote. */
export function CandidateList({ electionId, canVote }: CandidateListProps) {
  const copy = useMessages(messages);
  const candidates = useCandidates(electionId);
  const ballot = useGameAction((_, candidacyId: number) => vote(candidacyId), {
    refreshes: [['parties']],
  });
  const rows = candidates.data ?? [];

  return (
    <>
      <h3 className="at-title-3">{copy.candidatesTitle}</h3>
      <ActionFeedback
        problem={ballot.problem}
        copy={copy}
        success={ballot.succeeded ? copy.voteCast : null}
      />
      {candidates.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noCandidates}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((candidate) => (
          <li key={candidate.candidacy_id}>
            <span>
              {candidate.name}{' '}
              <span className={styles.muted}>{copy.level(candidate.civil_level)}</span>
            </span>
            {canVote && !ballot.succeeded ? (
              <Button
                variant="secondary"
                disabled={ballot.pending}
                aria-label={copy.voteFor(candidate.name)}
                onClick={() => {
                  ballot.run(candidate.candidacy_id);
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
