import { Panel } from '@concordia/atlas/Panel';

import type { AdminCountry } from '../../features/admin/queries';
import { useAdminLog } from '../../features/admin/queries';
import { countryName } from '../../features/world/names';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { describeState } from './describeState';
import { actionNames, messages } from './messages';

/** Every admin action: when, who, what, and the state before and after. */
export function AdminLogSection({ countries }: { countries: readonly AdminCountry[] }) {
  const copy = useMessages(messages);
  const actions = useMessages(actionNames);
  const { locale } = useLocale();
  const log = useAdminLog(true);
  const entries = log.data ?? [];
  const targetName = (target: string) => {
    // Regions are coded ARG-05; countries by their three letters.
    if (target.includes('-')) return target;
    const country = countries.find((item) => item.code === target);
    return country ? countryName(country, locale) : target;
  };
  const actionName = (action: string) =>
    action in actions ? actions[action as keyof typeof actions] : action;

  return (
    <Panel className={styles.section} aria-labelledby="log-title">
      <div>
        <h2 id="log-title" className="at-title-2">
          {copy.logTitle}
        </h2>
        <p>{copy.logIntro}</p>
      </div>
      {log.isSuccess && entries.length === 0 ? <p>{copy.emptyLog}</p> : null}
      {entries.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="at-visually-hidden">{copy.logTitle}</caption>
            <thead>
              <tr>
                <th scope="col">{copy.when}</th>
                <th scope="col">{copy.who}</th>
                <th scope="col">{copy.what}</th>
                <th scope="col">{copy.before}</th>
                <th scope="col">{copy.after}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.created_at, locale)}</td>
                  <td>{entry.actor_name}</td>
                  <td>
                    {actionName(entry.action)} · {targetName(entry.target)}
                  </td>
                  <td>{describeState(entry.before, copy, locale)}</td>
                  <td>{describeState(entry.after, copy, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
