import { Button } from '@concordia/atlas/Button';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import type { JobOffer } from '../../features/economy/queries';
import { useRegionName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface JobOffersTableProps {
  offers: readonly JobOffer[];
  /** Taking a job is the main action while the player has none. */
  primary: boolean;
  onTake: (companyId: number) => void;
}

/** One row per offer: company, region, good, wage and vacancies. */
export function JobOffersTable({ offers, primary, onTake }: JobOffersTableProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const regionName = useRegionName();
  const goodName = useGoodName();
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table} aria-labelledby="offers-title">
        <thead>
          <tr>
            <th scope="col">{copy.company}</th>
            <th scope="col">{copy.region}</th>
            <th scope="col">{copy.produces}</th>
            <th scope="col" className={styles.number}>
              {copy.wage}
            </th>
            <th scope="col" className={styles.number}>
              {copy.vacancies}
            </th>
            <th scope="col">{copy.action}</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.company_id}>
              <td>{offer.name}</td>
              <td>{regionName(offer.region_code)}</td>
              <td>{goodName(offer.good_code)}</td>
              <td className={styles.number}>{formatMoney(offer.wage, locale)}</td>
              <td className={styles.number}>{offer.vacancies}</td>
              <td>
                <Button
                  variant={primary ? 'primary' : 'secondary'}
                  aria-label={copy.takeLabel(offer.name)}
                  onClick={() => {
                    onTake(offer.company_id);
                  }}
                >
                  {copy.take}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
