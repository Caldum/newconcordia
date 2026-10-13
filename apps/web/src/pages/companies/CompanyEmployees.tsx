import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useCompanyEmployees } from '../../features/economy/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Who works in the company, whether they worked today and their streak. */
export function CompanyEmployees({ companyId }: { companyId: number }) {
  const copy = useMessages(messages);
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
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => (
                <tr key={employee.name}>
                  <td>{employee.name}</td>
                  <td>{employee.worked_today ? copy.worked : copy.notYet}</td>
                  <td className={styles.number}>{employee.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
