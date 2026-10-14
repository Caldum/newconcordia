import styles from '../../features/economy/economy.module.css';
import type { NationalElection } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** During the vote: that the player voted, or why they cannot. */
export function VoteNote({ election }: { election: NationalElection }) {
  const copy = useMessages(messages);
  if (election.i_voted) return <p className={styles.muted}>{copy.votedNote}</p>;
  if (!election.i_can_vote) return <p className={styles.muted}>{copy.cannotVote}</p>;
  return null;
}
