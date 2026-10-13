import { Button } from '@concordia/atlas/Button';

import styles from '../../features/economy/economy.module.css';
import type { MarketOffer } from '../../features/market/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface MarketOffersTableProps {
  offers: readonly MarketOffer[];
  chosenId: number | null;
  onChoose: (offerId: number) => void;
}

/** One row per offer: seller, origin, units and price, with a button to choose it. */
export function MarketOffersTable({ offers, chosenId, onChoose }: MarketOffersTableProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table} aria-labelledby="offers-title">
        <thead>
          <tr>
            <th scope="col">{copy.seller}</th>
            <th scope="col">{copy.origin}</th>
            <th scope="col" className={styles.number}>
              {copy.available}
            </th>
            <th scope="col" className={styles.number}>
              {copy.price}
            </th>
            <th scope="col">{copy.choose}</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => {
            const selected = offer.offer_id === chosenId;
            return (
              <tr key={offer.offer_id}>
                <td>{offer.seller_name}</td>
                <td>{countryName(offer.origin_country_code)}</td>
                <td className={styles.number}>{offer.quantity}</td>
                <td className={styles.number}>{formatMoney(offer.price, locale)}</td>
                <td>
                  <Button
                    variant={selected ? 'primary' : 'secondary'}
                    aria-pressed={selected}
                    aria-label={copy.chooseLabel(offer.seller_name)}
                    onClick={() => {
                      onChoose(offer.offer_id);
                    }}
                  >
                    {selected ? copy.chosen : copy.choose}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
