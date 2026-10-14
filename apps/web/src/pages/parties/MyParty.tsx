import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import type { Party } from '../../features/politics/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { DonateForm } from './DonateForm';
import { LeaderElection } from './LeaderElection';
import { LeavePartyButton } from './LeavePartyButton';
import { messages } from './messages';
import { PartyMembers } from './PartyMembers';

interface MyPartyProps {
  party: Party;
  isLeader: boolean;
}

/** The player's party: its facts and funds, its leader election, donating, members and leaving. */
export function MyParty({ party, isLeader }: MyPartyProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  return (
    <>
      <Panel className={styles.panel} aria-labelledby="my-party-title">
        <p className={styles.muted}>{copy.mineTitle}</p>
        <h2 id="my-party-title" className="at-title-2">
          {party.name}
        </h2>
        {party.description ? <p>{party.description}</p> : null}
        <p className={styles.muted}>
          {copy.members(party.members)} ·{' '}
          {copy.funds(formatMoney(party.gold, locale), formatMoney(party.credit, locale))}
        </p>
        {isLeader ? <p>{copy.youLead}</p> : null}
        <LeavePartyButton />
      </Panel>
      <LeaderElection partyId={party.party_id} />
      <DonateForm partyId={party.party_id} />
      <PartyMembers partyId={party.party_id} />
    </>
  );
}
