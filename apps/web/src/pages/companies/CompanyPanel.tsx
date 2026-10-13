import { Panel } from '@concordia/atlas/Panel';
import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import type { Company } from '../../features/economy/queries';
import { useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { CompanyCash } from './CompanyCash';
import { CompanyEmployees } from './CompanyEmployees';
import { CompanyJobOffer } from './CompanyJobOffer';
import { CompanyStock } from './CompanyStock';
import { CompanyUpgrades } from './CompanyUpgrades';
import { messages } from './messages';

/** One company: what it makes and where, and a section for each thing the owner manages. */
export function CompanyPanel({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const goodName = useGoodName();
  const regionName = useRegionName();
  const titleId = useId();

  return (
    <Panel className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.panelHead}>
        <div>
          <h2 id={titleId} className="at-title-2">
            {company.name}
          </h2>
          <p className={styles.muted}>
            {`${goodName(company.good_code)} · ${regionName(company.region_code)} · ${copy.level(company.level, company.capacity)}`}
          </p>
        </div>
        <CompanyUpgrades company={company} />
      </div>
      <div className={styles.layout}>
        <div className={styles.column}>
          <CompanyEmployees companyId={company.id} />
          <CompanyStock company={company} />
        </div>
        <div className={styles.column}>
          <CompanyCash company={company} />
          <CompanyJobOffer company={company} />
        </div>
      </div>
    </Panel>
  );
}
