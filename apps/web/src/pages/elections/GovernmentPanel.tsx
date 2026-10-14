import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useCongress, useGovernment } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The president, the vice president and the members of Congress in office. */
export function GovernmentPanel() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const government = useGovernment(citizen.country_code);
  const congress = useCongress(citizen.country_code);
  const holder = (office: 'president' | 'vice_president') => {
    const person = government.data?.find((row) => row.office === office);
    return person ? copy.officeholder(person.name, person.party_name) : copy.vacant;
  };
  const members = congress.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="government-title">
      <h2 id="government-title" className="at-title-3">
        {copy.governmentTitle}
      </h2>
      <dl className={styles.lines}>
        <div>
          <dt>{copy.president}</dt>
          <dd>{holder('president')}</dd>
        </div>
        <div>
          <dt>{copy.vicePresident}</dt>
          <dd>{holder('vice_president')}</dd>
        </div>
      </dl>
      <h3 className="at-title-3">{copy.congressTitle(members.length)}</h3>
      {congress.isSuccess && members.length === 0 ? (
        <p className={styles.muted}>{copy.noCongress}</p>
      ) : null}
      <ul className={styles.recipes}>
        {members.map((member) => (
          <li key={member.name}>
            <span>{member.name}</span>
            <span className={styles.muted}>{member.party_name}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
