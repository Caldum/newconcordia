import styles from '../../features/economy/economy.module.css';
import { qualityOf } from '../../features/economy/goods';
import type { Company } from '../../features/economy/queries';
import { formatNumber, formatPercent, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** Level, paid shifts used today, efficiency (extractors) or quality (manufacturers), national bonus. */
export function CompanyFacts({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const quality = qualityOf(company.good_code);
  return (
    <dl className={styles.facts}>
      <div>
        <dt>{copy.level}</dt>
        <dd>{copy.levelValue(company.level)}</dd>
      </div>
      <div>
        <dt>{copy.shiftsToday}</dt>
        <dd>{copy.shiftsValue(company.shifts_today, company.shifts_per_day)}</dd>
      </div>
      {company.efficiency !== null ? (
        <div>
          <dt>{copy.efficiency}</dt>
          <dd>{copy.efficiencyValue(formatNumber(company.efficiency, locale))}</dd>
        </div>
      ) : quality !== null ? (
        <div>
          <dt>{copy.quality}</dt>
          <dd>{copy.qualityValue(quality)}</dd>
        </div>
      ) : null}
      <div>
        <dt>{copy.nationalBonus}</dt>
        <dd>{copy.nationalBonusValue(formatPercent(company.national_bonus, locale))}</dd>
      </div>
    </dl>
  );
}
