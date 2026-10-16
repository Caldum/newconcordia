import { Button } from '@concordia/atlas/Button';

import { useGameAction } from '../../features/actions/useGameAction';
import { revokeStaff } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import { useCurrentStaff } from '../../features/admin/CurrentStaff';
import type { AdminTeamMember } from '../../features/admin/queries';
import { formatDate, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { messages } from './messages';

/** One staff member: email, role, who added them, and removing them (never oneself). */
export function TeamMemberItem({ member }: { member: AdminTeamMember }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const me = useCurrentStaff();
  const revoke = useGameAction(() => revokeStaff(member.email));
  const self = member.email.toLowerCase() === me.email.toLowerCase();
  return (
    <li>
      <div className={styles.row}>
        <span>
          <strong>{member.email}</strong> · {copy[`role_${member.role}`]}
          <br />
          <span className={styles.meta}>
            {copy.addedBy(member.added_by ?? '—', formatDate(member.added_at, locale))}
          </span>
          {member.is_citizen ? (
            <>
              <br />
              <span className={styles.meta}>{copy.isCitizen}</span>
            </>
          ) : null}
        </span>
        {self ? null : (
          <Button
            variant="ghost"
            disabled={revoke.pending}
            aria-label={copy.revokeStaffAria(member.email)}
            onClick={() => {
              revoke.run();
            }}
          >
            {copy.revokeStaff}
          </Button>
        )}
      </div>
      <ConsoleFeedback problem={revoke.problem} copy={copy} />
    </li>
  );
}
