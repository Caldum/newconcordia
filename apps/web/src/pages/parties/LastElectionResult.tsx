import { useLastPartyElection } from '../../features/politics/queries';

import { LastElectionWinner } from './LastElectionWinner';

/** Who won the party's last leader election, once there has been one. */
export function LastElectionResult({ partyId }: { partyId: number }) {
  const last = useLastPartyElection(partyId);
  return last.data ? <LastElectionWinner electionId={last.data.election_id} /> : null;
}
