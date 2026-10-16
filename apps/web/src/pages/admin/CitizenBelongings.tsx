import { Panel } from '@concordia/atlas/Panel';

import { consoleMessages } from '../../features/admin/messages';
import type { CitizenRecord } from '../../features/admin/queries';
import { useRegionName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';
import { RenameItem } from './RenameItem';

/** The citizen's money, and what they named: party, regiment, newspaper and companies, each renamable. */
export function CitizenBelongings({ record }: { record: CitizenRecord }) {
  const copy = useMessages(citizenMessages);
  const shared = useMessages(consoleMessages);
  const { locale } = useLocale();
  const regionName = useRegionName();
  return (
    <Panel className={styles.section} aria-labelledby="citizen-belongings">
      <h2 id="citizen-belongings" className="at-title-3">
        {copy.moneyTitle}
      </h2>
      {record.balances.length === 0 ? <p>{copy.noMoney}</p> : null}
      <dl className={styles.stats}>
        {record.balances.map((account) => (
          <div key={account.currency_code}>
            <dt>{account.currency_code}</dt>
            <dd>
              {account.currency_code === 'GOLD'
                ? shared.goldAmount(formatMoney(account.balance, locale))
                : formatMoney(account.balance, locale)}
            </dd>
          </div>
        ))}
      </dl>
      <ul className={styles.list}>
        {record.party ? (
          <RenameItem
            kind="party"
            id={record.party.id}
            name={record.party.name}
            label={`${copy.party}: ${record.party.name}`}
          />
        ) : null}
        {record.regiment ? (
          <RenameItem
            kind="regiment"
            id={record.regiment.id}
            name={record.regiment.name}
            label={`${copy.regiment}: ${record.regiment.name}`}
          />
        ) : null}
        {record.newspaper ? (
          <RenameItem
            kind="newspaper"
            id={record.newspaper.id}
            name={record.newspaper.name}
            label={`${copy.newspaper}: ${record.newspaper.name}`}
          />
        ) : null}
        {record.companies.map((company) => (
          <RenameItem
            key={company.id}
            kind="company"
            id={company.id}
            name={company.name}
            label={copy.companyLine(company.name, company.level, regionName(company.region_code))}
          />
        ))}
      </ul>
    </Panel>
  );
}
