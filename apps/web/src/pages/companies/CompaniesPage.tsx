import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { useMyCompanies } from '../../features/economy/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { CompanyPanel } from './CompanyPanel';
import { messages } from './messages';
import { NoCompanies } from './NoCompanies';

/** `/companies` (Company canvas): every company the player owns. */
export function CompaniesPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const companies = useMyCompanies();
  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {companies.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {companies.data?.length === 0 ? <NoCompanies /> : null}
      {companies.data?.map((company) => (
        <CompanyPanel key={company.id} company={company} />
      ))}
    </main>
  );
}
