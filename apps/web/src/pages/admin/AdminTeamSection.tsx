import { Panel } from '@concordia/atlas/Panel';

import { useAdminTeam } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { messages } from './messages';

/** Who administers the game. */
export function AdminTeamSection() {
  const copy = useMessages(messages);
  const team = useAdminTeam(true);
  return (
    <Panel className={styles.section} aria-labelledby="team-title">
      <div>
        <h2 id="team-title" className="at-title-2">
          {copy.teamTitle}
        </h2>
        <p>{copy.teamIntro}</p>
      </div>
      <ul className={styles.team}>
        {team.data?.map((member) => (
          <li key={member.email}>
            <strong>{member.name}</strong> <span>{member.email}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
