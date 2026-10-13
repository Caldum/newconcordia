import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useCompanyEmployees } from '../../features/economy/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import { SecondShiftAuthorization } from './SecondShiftAuthorization';

/** Who works in the company: today, their streak and their second shift, and authorizing it. */
export function CompanyEmployees({ companyId }: { companyId: number }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const employees = useCompanyEmployees(companyId);
  const titleId = useId();
  const rows = employees.data ?? [];
  return (
    <section className={styles.form} aria-labelledby={titleId}>
      <h3 id={titleId} className="at-title-3">
        {copy.employees}
      </h3>
      {employees.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noEmployees}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-labelledby={titleId}>
            <thead>
              <tr>
                <th scope="col">{copy.name}</th>
                <th scope="col">{copy.today}</th>
                <th scope="col" className={styles.number}>
                  {copy.streak}
                </th>
                <th scope="col" className={styles.number}>
                  {copy.secondShift}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => (
                <tr key={employee.name}>
                  <td>{employee.name}</td>
                  <td>{employee.worked_today ? copy.worked : copy.notYet}</td>
                  <td className={styles.number}>{employee.streak}</td>
                  <td className={styles.number}>
                    {employee.second_shift_wage === null
                      ? copy.noSecondShift
                      : formatMoney(employee.second_shift_wage, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {rows.length > 0 ? <SecondShiftAuthorization companyId={companyId} employees={rows} /> : null}
    </section>
  );
}
