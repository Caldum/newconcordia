import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { electionStep } from '../../features/politics/phase';
import type { NationalElection } from '../../features/politics/queries';
import { useMessages } from '../../i18n';
import { useNow } from '../../lib/useNow';

import { ElectionSchedule } from './ElectionSchedule';
import { messages } from './messages';
import { TicketForm } from './TicketForm';
import { TicketList } from './TicketList';
import { VoteNote } from './VoteNote';
import { WithdrawCandidacyButton } from './WithdrawCandidacyButton';

interface PresidentialElectionProps {
  election: NationalElection;
  /** The party the player leads, which may register a ticket; null otherwise. */
  leaderOf: number | null;
}

/** The month's presidential election: its schedule, the tickets, voting and the leader's ticket. */
export function PresidentialElection({ election, leaderOf }: PresidentialElectionProps) {
  const copy = useMessages(messages);
  const step = electionStep(election, useNow());
  return (
    <Panel className={styles.panel} aria-labelledby="presidential-title">
      <h2 id="presidential-title" className="at-title-3">
        {copy.presidentialTitle}
      </h2>
      <ElectionSchedule election={election} step={step} />
      <TicketList
        electionId={election.election_id}
        canVote={step === 'voting' && election.i_can_vote}
      />
      {step === 'voting' ? <VoteNote election={election} /> : null}
      {step === 'candidacies' && leaderOf !== null ? (
        <>
          <TicketForm partyId={leaderOf} />
          <WithdrawCandidacyButton kind="president" />
        </>
      ) : null}
    </Panel>
  );
}
