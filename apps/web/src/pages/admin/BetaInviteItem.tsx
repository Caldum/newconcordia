import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { revokeBetaInvite } from '../../features/moderation/api';
import type { BetaInvite } from '../../features/moderation/queries';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { moderationMessages } from './moderationMessages';

/** One invitation: the email, whether it was used, and withdrawing it while unused. */
export function BetaInviteItem({ invite }: { invite: BetaInvite }) {
  const copy = useMessages(moderationMessages);
  const { locale } = useLocale();
  const revoke = useGameAction(() => revokeBetaInvite(invite.email));
  return (
    <li>
      <span>
        <strong>{invite.email}</strong>
        {invite.note ? ` · ${invite.note}` : null}
        <br />
        <span className={styles.muted}>
          {invite.used_at ? copy.used(formatDate(invite.used_at, locale)) : copy.pending}
        </span>
        <ActionFeedback problem={revoke.problem} copy={copy} />
      </span>
      {invite.used_at ? null : (
        <Button
          variant="ghost"
          disabled={revoke.pending}
          aria-label={copy.revokeAria(invite.email)}
          onClick={() => {
            revoke.run();
          }}
        >
          {copy.revoke}
        </Button>
      )}
    </li>
  );
}
