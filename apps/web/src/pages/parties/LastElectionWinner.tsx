import { useCandidates } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The winner of a proclaimed election and their votes, or that nobody got votes. */
export function LastElectionWinner({ electionId }: { electionId: number }) {
  const copy = useMessages(messages);
  const candidates = useCandidates(electionId);
  if (!candidates.isSuccess) return null;
  const winner = candidates.data.find((candidate) => candidate.elected);
  return <p>{winner ? copy.lastResult(winner.name, winner.votes ?? 0) : copy.lastNoWinner}</p>;
}
