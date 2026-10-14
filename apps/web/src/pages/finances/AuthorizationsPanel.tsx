import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useBankAuthorizations } from '../../features/fx/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useMessages } from '../../i18n';

import { AuthorizationItem } from './AuthorizationItem';
import { AuthorizeForm } from './AuthorizeForm';
import { messages } from './messages';

interface AuthorizationsPanelProps {
  isEconomyMinister: boolean;
  isGovernor: boolean;
}

/** Single-use authorizations for Central Bank transfers to companies: public, executed once by the governor. */
export function AuthorizationsPanel({ isEconomyMinister, isGovernor }: AuthorizationsPanelProps) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const authorizations = useBankAuthorizations(citizen.country_code);
  const rows = authorizations.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="authorizations-title">
      <h2 id="authorizations-title" className="at-title-3">
        {copy.authorizationsTitle}
      </h2>
      <p className={styles.muted}>{copy.authorizationsHint}</p>
      {authorizations.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noAuthorizations}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((authorization) => (
          <AuthorizationItem
            key={authorization.authorization_id}
            authorization={authorization}
            canExecute={isGovernor}
            canCancel={isEconomyMinister}
          />
        ))}
      </ul>
      {isEconomyMinister ? <AuthorizeForm /> : null}
    </Panel>
  );
}
