import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { usePartyMembers } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The party's members, leader first, with their civil level. */
export function PartyMembers({ partyId }: { partyId: number }) {
  const copy = useMessages(messages);
  const members = usePartyMembers(partyId);
  return (
    <Panel className={styles.panel} aria-labelledby="members-title">
      <h2 id="members-title" className="at-title-3">
        {copy.membersTitle}
      </h2>
      <ul className={styles.recipes}>
        {(members.data ?? []).map((member) => (
          <li key={member.name}>
            <span>{member.name}</span>
            <span className={styles.muted}>
              {member.is_leader ? `${copy.leaderTag} · ` : null}
              {copy.level(member.civil_level)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
