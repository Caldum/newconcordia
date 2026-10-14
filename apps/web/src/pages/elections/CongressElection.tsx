import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { electionStep } from '../../features/politics/phase';
import type { NationalElection } from '../../features/politics/queries';
import { useMessages } from '../../i18n';
import { useNow } from '../../lib/useNow';

import { ElectionSchedule } from './ElectionSchedule';
import { messages } from './messages';
import { PartyListForm } from './PartyListForm';
import { PartyListList } from './PartyListList';
import { VoteNote } from './VoteNote';
import { WithdrawCandidacyButton } from './WithdrawCandidacyButton';

interface CongressElectionProps {
  election: NationalElection;
  /** The party the player leads, which may register a list; null otherwise. */
  leaderOf: number | null;
}

/** The month's congressional election: its schedule and seats, the lists, voting and the leader's list. */
export function CongressElection({ election, leaderOf }: CongressElectionProps) {
  const copy = useMessages(messages);
  const step = electionStep(election, useNow());
  return (
    <Panel className={styles.panel} aria-labelledby="congress-election-title">
      <h2 id="congress-election-title" className="at-title-3">
        {copy.congressElectionTitle}
      </h2>
      <ElectionSchedule election={election} step={step} />
      {election.seats === null ? null : <p>{copy.seats(election.seats)}</p>}
      <PartyListList
        electionId={election.election_id}
        canVote={step === 'voting' && election.i_can_vote}
      />
      {step === 'voting' ? <VoteNote election={election} /> : null}
      {step === 'candidacies' && leaderOf !== null ? (
        <>
          <PartyListForm partyId={leaderOf} />
          <WithdrawCandidacyButton kind="congress" />
        </>
      ) : null}
    </Panel>
  );
}
