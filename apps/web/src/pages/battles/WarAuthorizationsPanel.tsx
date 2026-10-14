import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useWarAuthorizations } from '../../features/war/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { WarAuthorizationItem } from './WarAuthorizationItem';

/** The country's war authorizations; the president may cancel a valid one (its 50 Gold return). */
export function WarAuthorizationsPanel({ canCancel }: { canCancel: boolean }) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const authorizations = useWarAuthorizations(citizen.country_code);
  const rows = authorizations.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="war-authorizations-title">
      <h2 id="war-authorizations-title" className="at-title-3">
        {copy.authorizationsTitle}
      </h2>
      {authorizations.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noAuthorizations}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((authorization) => (
          <WarAuthorizationItem
            key={authorization.authorization_id}
            authorization={authorization}
            canCancel={canCancel}
          />
        ))}
      </ul>
    </Panel>
  );
}
