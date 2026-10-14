import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { vote } from '../../features/politics/api';
import { useTickets } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface TicketListProps {
  electionId: number;
  /** The player may cast their ballot now. */
  canVote: boolean;
}

/** The presidential tickets, their result once proclaimed, and voting for one. */
export function TicketList({ electionId, canVote }: TicketListProps) {
  const copy = useMessages(messages);
  const tickets = useTickets(electionId);
  const ballot = useGameAction((_, candidacyId: number) => vote(candidacyId), {
    refreshes: [['elections']],
  });
  const rows = tickets.data ?? [];

  return (
    <>
      <h3 className="at-title-3">{copy.ticketsTitle}</h3>
      <ActionFeedback
        problem={ballot.problem}
        copy={copy}
        success={ballot.succeeded ? copy.voteCast : null}
      />
      {tickets.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noTickets}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((ticket) => (
          <li key={ticket.candidacy_id}>
            <span>
              <strong>{ticket.party_name}</strong>
              <br />
              {copy.ticket(ticket.president_name, ticket.vice_president_name)}
              {ticket.votes === null ? null : (
                <span className={styles.muted}>
                  {' · '}
                  {copy.result(ticket.votes)}
                  {ticket.elected ? ` · ${copy.elected}` : null}
                </span>
              )}
            </span>
            {canVote && !ballot.succeeded ? (
              <Button
                variant="secondary"
                disabled={ballot.pending}
                aria-label={copy.voteFor(ticket.party_name)}
                onClick={() => {
                  ballot.run(ticket.candidacy_id);
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
