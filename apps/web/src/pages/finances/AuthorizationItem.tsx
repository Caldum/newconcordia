import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { cancelAuthorization, executeAuthorization } from '../../features/fx/api';
import type { BankAuthorization } from '../../features/fx/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface AuthorizationItemProps {
  authorization: BankAuthorization;
  /** The player governs the Central Bank. */
  canExecute: boolean;
  /** The player is the Economy minister. */
  canCancel: boolean;
}

/** One authorization: company, amount, who authorized it and its state; the governor executes it once. */
export function AuthorizationItem({
  authorization,
  canExecute,
  canCancel,
}: AuthorizationItemProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const act = useGameAction(
    (_, action: 'execute' | 'cancel') =>
      action === 'execute'
        ? executeAuthorization(authorization.authorization_id)
        : cancelAuthorization(authorization.authorization_id),
    { refreshes: [['finances']] },
  );
  const amount = `${formatMoney(authorization.amount, locale)} ${
    authorization.currency_code === 'GOLD' ? copy.gold : copy.credit
  }`;
  const line = copy.authorizationLine(
    authorization.company_name,
    amount,
    authorization.authorized_by_name,
  );
  const open = authorization.status === 'open' && !act.succeeded;

  return (
    <li>
      <span>
        {line}
        <br />
        <span className={styles.muted}>
          {authorization.status === 'executed' && authorization.executed_by_name
            ? copy.authorizationExecuted(authorization.executed_by_name)
            : copy[`authorization_${authorization.status}`]}
        </span>
        <ActionFeedback
          problem={act.problem}
          copy={copy}
          success={act.succeeded ? copy.authorizationDone : null}
        />
      </span>
      {open && (canExecute || canCancel) ? (
        <span>
          {canExecute ? (
            <Button
              variant="secondary"
              disabled={act.pending}
              aria-label={copy.executeAria(line)}
              onClick={() => {
                act.run('execute');
              }}
            >
              {copy.execute}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="secondary"
              disabled={act.pending}
              aria-label={copy.cancelAria(line)}
              onClick={() => {
                act.run('cancel');
              }}
            >
              {copy.cancelAuthorization}
            </Button>
          ) : null}
        </span>
      ) : null}
    </li>
  );
}
