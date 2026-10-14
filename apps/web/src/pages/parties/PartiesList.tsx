import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { joinParty } from '../../features/politics/api';
import type { Party } from '../../features/politics/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface PartiesListProps {
  parties: readonly Party[];
  /** The player already belongs to a party: joining another is not offered. */
  inParty: boolean;
}

/** Every party of the country, largest first, with its leader, its public funds and joining. */
export function PartiesList({ parties, inParty }: PartiesListProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const join = useGameAction((_, party: Party) => joinParty(party.party_id), {
    refreshes: [['parties']],
  });

  return (
    <Panel className={styles.panel} aria-labelledby="parties-title">
      <h2 id="parties-title" className="at-title-3">
        {copy.listTitle}
      </h2>
      <ActionFeedback
        problem={join.problem}
        copy={copy}
        success={join.succeeded && join.variables ? copy.joined(join.variables.name) : null}
      />
      {parties.length === 0 ? <p className={styles.muted}>{copy.noParties}</p> : null}
      <ul className={styles.recipes}>
        {parties.map((party) => (
          <li key={party.party_id}>
            <span>
              <strong>{party.name}</strong>
              {party.description ? ` · ${party.description}` : null}
              <br />
              <span className={styles.muted}>
                {copy.members(party.members)} ·{' '}
                {party.leader_name ? copy.leads(party.leader_name) : copy.noLeader} ·{' '}
                {copy.funds(formatMoney(party.gold, locale), formatMoney(party.credit, locale))}
              </span>
            </span>
            {inParty ? null : (
              <Button
                variant="secondary"
                disabled={join.pending}
                aria-label={copy.joinLabel(party.name)}
                onClick={() => {
                  join.run(party);
                }}
              >
                {copy.join}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
