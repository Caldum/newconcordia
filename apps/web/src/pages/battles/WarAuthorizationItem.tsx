import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { cancelWarAuthorization } from '../../features/war/api';
import type { WarAuthorization } from '../../features/war/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface WarAuthorizationItemProps {
  authorization: WarAuthorization;
  canCancel: boolean;
}

/** One authorization with its state, and the president's cancel button while it is valid. */
export function WarAuthorizationItem({ authorization, canCancel }: WarAuthorizationItemProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const country = countryName(authorization.target_country_code);
  const cancel = useGameAction(() => cancelWarAuthorization(authorization.authorization_id), {
    refreshes: [['war']],
  });
  const pending = authorization.status === 'pending' && !cancel.succeeded;

  return (
    <li>
      <span>
        {copy.authorizationLine(country, copy[`status_${authorization.status}`])}
        {pending ? (
          <>
            <br />
            <span className={styles.muted}>
              {copy.expires(formatDateTime(authorization.expires_at, locale))}
            </span>
          </>
        ) : null}
        <ActionFeedback
          problem={cancel.problem}
          copy={copy}
          success={cancel.succeeded ? copy.cancelled : null}
        />
      </span>
      {canCancel && pending ? (
        <Button
          variant="secondary"
          disabled={cancel.pending}
          aria-label={copy.cancelAria(country)}
          onClick={() => {
            cancel.run();
          }}
        >
          {copy.cancel}
        </Button>
      ) : null}
    </li>
  );
}
