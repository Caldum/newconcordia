import styles from '../../features/economy/economy.module.css';
import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { CompanyFounded } from './CompanyFounded';
import { CompanyGoodChoice } from './CompanyGoodChoice';
import { CompanyNameStep } from './CompanyNameStep';
import { CompanyRegionChoice } from './CompanyRegionChoice';
import { FoundCompanySummary } from './FoundCompanySummary';
import { foundMessages as messages } from './messages';
import { useFoundCompanyForm } from './useFoundCompanyForm';

/** `/companies/new` (FoundCompany canvas): what, where and its name, with the summary and the cost. */
export function FoundCompanyPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const form = useFoundCompanyForm();

  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      <CompanyFounded founded={form.founded} />
      <form
        className={styles.layout}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          form.submit();
        }}
      >
        <div className={styles.column}>
          <CompanyGoodChoice good={form.good} onChange={form.setGood} />
          <CompanyRegionChoice
            good={form.good}
            regions={form.regions}
            regionCode={form.regionCode}
            onChange={form.setRegionCode}
          />
          <CompanyNameStep name={form.name} invalid={form.nameError} onChange={form.setName} />
        </div>
        <FoundCompanySummary
          good={form.good}
          regionCode={form.regionCode}
          foreignHost={form.foreignHost}
          action={form.action}
        />
      </form>
    </main>
  );
}
