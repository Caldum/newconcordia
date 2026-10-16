import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { grantStaff } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import { useAdminTeam } from '../../features/admin/queries';
import type { StaffRole } from '../../features/admin/queries';
import economy from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { messages } from './messages';
import { TeamMemberItem } from './TeamMemberItem';

/** The staff: who has which role, giving an account a role by its email, and taking it away. Audited. */
export function AdminTeamSection() {
  const copy = useMessages(messages);
  const team = useAdminTeam(true);
  const roleId = useId();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('moderator');
  const grant = useGameAction((_, value: string) => grantStaff(value, role), {
    onSuccess: () => {
      setEmail('');
    },
  });
  return (
    <Panel className={styles.section} aria-labelledby="team-title">
      <div>
        <h2 id="team-title" className="at-title-2">
          {copy.teamTitle}
        </h2>
        <p>{copy.teamIntro}</p>
      </div>
      <ul className={styles.list}>
        {team.data?.map((member) => (
          <TeamMemberItem key={member.email} member={member} />
        ))}
      </ul>
      <form
        className={styles.row}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          grant.run(email.trim());
        }}
      >
        <Field
          label={copy.staffEmail}
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            grant.changed();
          }}
        />
        <div className={economy.field}>
          <label htmlFor={roleId} className={economy.label}>
            {copy.roleLabel}
          </label>
          <select
            id={roleId}
            className={economy.select}
            value={role}
            onChange={(event) => {
              setRole(event.target.value as StaffRole);
              grant.changed();
            }}
          >
            <option value="moderator">{copy.role_moderator}</option>
            <option value="admin">{copy.role_admin}</option>
          </select>
        </div>
        <Button type="submit" disabled={grant.pending || email.trim() === ''}>
          {copy.grant}
        </Button>
      </form>
      <ConsoleFeedback
        problem={grant.problem}
        copy={copy}
        success={grant.succeeded ? copy.granted : null}
      />
    </Panel>
  );
}
