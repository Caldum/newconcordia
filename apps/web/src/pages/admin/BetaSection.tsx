import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { looksLikeEmail } from '../../features/auth/emailAddress';
import styles from '../../features/economy/economy.module.css';
import { inviteToBeta, setClosedBeta } from '../../features/moderation/api';
import { useBetaInvites, useBetaStatus } from '../../features/moderation/queries';
import { useMessages } from '../../i18n';

import { BetaInviteItem } from './BetaInviteItem';
import { moderationMessages } from './moderationMessages';

/** The closed beta: whether it is on, inviting emails and the invitations so far. Every change is audited. */
export function BetaSection() {
  const copy = useMessages(moderationMessages);
  const status = useBetaStatus();
  const invites = useBetaInvites(true);
  const closed = status.data ?? false;
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const toggle = useGameAction((_, value: boolean) => setClosedBeta(value), {
    refreshes: [['beta-status']],
  });
  const invite = useGameAction((_, value: string) => inviteToBeta(value, note.trim()), {
    onSuccess: () => {
      setEmail('');
      setNote('');
      setChecked(false);
    },
  });
  const valid = looksLikeEmail(email.trim());
  return (
    <Panel className={styles.panel} aria-labelledby="beta-title">
      <h2 id="beta-title" className="at-title-3">
        {copy.betaTitle}
      </h2>
      <p>{closed ? copy.betaClosed : copy.betaOpen}</p>
      <ActionFeedback problem={toggle.problem} copy={copy} />
      <div>
        <Button
          variant="secondary"
          disabled={toggle.pending || !status.isSuccess}
          onClick={() => {
            toggle.run(!closed);
          }}
        >
          {closed ? copy.openBeta : copy.closeBeta}
        </Button>
      </div>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (valid) invite.run(email.trim());
        }}
      >
        <Field
          label={copy.inviteEmail}
          type="email"
          autoComplete="off"
          value={email}
          error={checked && !valid ? copy.error_email_invalid : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            invite.changed();
          }}
        />
        <Field
          label={copy.inviteNote}
          autoComplete="off"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
          }}
        />
        <ActionFeedback
          problem={invite.problem}
          copy={copy}
          success={invite.succeeded ? copy.invited : null}
        />
        <div>
          <Button type="submit" disabled={invite.pending}>
            {copy.invite}
          </Button>
        </div>
      </form>
      {invites.isSuccess && invites.data.length === 0 ? (
        <p className={styles.muted}>{copy.noInvites}</p>
      ) : null}
      <ul className={styles.recipes}>
        {(invites.data ?? []).map((item) => (
          <BetaInviteItem key={item.email} invite={item} />
        ))}
      </ul>
    </Panel>
  );
}
