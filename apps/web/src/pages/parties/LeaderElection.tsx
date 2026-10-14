import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { electionStep } from '../../features/politics/phase';
import { usePartyElection } from '../../features/politics/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';
import { useNow } from '../../lib/useNow';

import { CandidacyButton } from './CandidacyButton';
import { CandidateList } from './CandidateList';
import { LastElectionResult } from './LastElectionResult';
import { messages } from './messages';

/** The party's monthly leader election: where it stands, the candidates, running and voting. */
export function LeaderElection({ partyId }: { partyId: number }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const now = useNow();
  const election = usePartyElection(partyId);
  const current = election.data ?? null;
  const step = current ? electionStep(current, now) : null;
  const when = (value: string) => formatDateTime(value, locale);

  return (
    <Panel className={styles.panel} aria-labelledby="election-title">
      <h2 id="election-title" className="at-title-3">
        {copy.electionTitle}
      </h2>
      <LastElectionResult partyId={partyId} />
      {current && step ? (
        <>
          <p>
            {step === 'candidacies'
              ? copy.candidacies(
                  when(current.registration_closes_at),
                  when(current.voting_starts_at),
                )
              : step === 'waiting'
                ? copy.waiting(when(current.voting_starts_at))
                : step === 'voting'
                  ? copy.voting(when(current.voting_ends_at), current.ballots, current.voters)
                  : copy.counting(when(current.takes_office_at))}
          </p>
          {step === 'candidacies' ? <CandidacyButton running={current.i_am_candidate} /> : null}
          <CandidateList
            electionId={current.election_id}
            canVote={step === 'voting' && current.i_can_vote}
          />
          {step === 'voting' && current.i_voted ? (
            <p className={styles.muted}>{copy.votedNote}</p>
          ) : null}
          {step === 'voting' && !current.i_voted && !current.i_can_vote ? (
            <p className={styles.muted}>{copy.cannotVote}</p>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}
