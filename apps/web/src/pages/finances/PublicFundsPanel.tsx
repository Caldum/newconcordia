import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { usePublicFinances } from '../../features/finance/queries';
import type { Institution, PublicFunds } from '../../features/finance/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

const institutions: readonly Institution[] = [
  'treasury',
  'economy',
  'defense',
  'foreign_affairs',
  'health',
  'development',
  'central_bank',
];

/** Free and reserved Gold and Credit of the Treasury, each ministry and the Central Bank. */
export function PublicFundsPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const funds = usePublicFinances(citizen.country_code);
  const cell = (row: PublicFunds | undefined) =>
    row ? (
      <>
        {formatMoney(row.balance, locale)}
        {row.held > 0 ? (
          <>
            <br />
            <span className={styles.muted}>{copy.held(formatMoney(row.held, locale))}</span>
          </>
        ) : null}
      </>
    ) : (
      '—'
    );

  return (
    <Panel className={styles.panel} aria-labelledby="funds-title">
      <h2 id="funds-title" className="at-title-3">
        {copy.fundsTitle}
      </h2>
      {funds.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{copy.institution}</th>
              <th scope="col" className={styles.number}>
                {copy.gold}
              </th>
              <th scope="col" className={styles.number}>
                {copy.credit}
              </th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((institution) => {
              const rows = (funds.data ?? []).filter((row) => row.institution === institution);
              return (
                <tr key={institution}>
                  <th scope="row">{copy[`institution_${institution}`]}</th>
                  <td className={styles.number}>
                    {cell(rows.find((row) => row.currency_code === 'GOLD'))}
                  </td>
                  <td className={styles.number}>
                    {cell(rows.find((row) => row.currency_code !== 'GOLD'))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
