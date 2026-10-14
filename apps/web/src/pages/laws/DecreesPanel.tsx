import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useDecrees } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { DecreeForm } from './DecreeForm';
import { messages } from './messages';

/** The latest decrees, public, and the president's form to sign one. */
export function DecreesPanel({ isPresident }: { isPresident: boolean }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const decrees = useDecrees(citizen.country_code);
  const rows = decrees.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="decrees-title">
      <h2 id="decrees-title" className="at-title-3">
        {copy.decreesTitle}
      </h2>
      {decrees.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noDecrees}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((decree) => (
          <li key={decree.decree_id}>
            <span>
              <strong>{decree.title}</strong>
              <br />
              {decree.body}
              <br />
              <span className={styles.muted}>
                {copy.decreeBy(decree.issued_by_name, formatDateTime(decree.issued_at, locale))}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {isPresident ? <DecreeForm /> : null}
    </Panel>
  );
}
