import styles from '../../features/economy/economy.module.css';
import type { MarketOffer } from '../../features/market/queries';
import { quantityIn } from '../../features/market/square';
import type { Ticket, TicketLine } from '../../features/market/square';
import { Avatar } from '../../features/profile/Avatar';
import { formatMoney, formatNumber, useLocale, useMessages } from '../../i18n';

import market from './MarketPage.module.css';
import { messages } from './messages';
import { ProductTile } from './ProductTile';
import { QuantityStepper } from './QuantityStepper';

interface OffersTableProps {
  offers: readonly MarketOffer[];
  good: string;
  ticket: Ticket;
  onLine: (line: TicketLine) => void;
}

/** One row per offer: the product, the seller and their country, units, price and how many go to the ticket. */
export function OffersTable({ offers, good, ticket, onLine }: OffersTableProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  return (
    <div className={styles.tableScroll}>
      <table className={`${styles.table} ${market.offers}`} aria-labelledby="offers-title">
        <thead>
          <tr>
            <th scope="col">{copy.product}</th>
            <th scope="col">{copy.seller}</th>
            <th scope="col" className={styles.number}>
              {copy.available}
            </th>
            <th scope="col" className={styles.number}>
              {copy.price}
            </th>
            <th scope="col">{copy.buyColumn}</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.offer_id}>
              <td>
                <ProductTile good={good} />
              </td>
              <td>
                <span className={market.seller}>
                  <Avatar name={offer.seller_name} path={null} size={32} />
                  <span>{offer.seller_name}</span>
                  <abbr className={market.origin}>{offer.origin_country_code}</abbr>
                </span>
              </td>
              <td className={styles.number}>{formatNumber(offer.quantity, locale)}</td>
              <td className={`${styles.number} ${market.price}`}>
                {formatMoney(offer.price, locale)}
              </td>
              <td>
                <QuantityStepper
                  value={quantityIn(ticket, offer.offer_id)}
                  max={offer.quantity}
                  label={copy.unitsOf(offer.seller_name)}
                  lessLabel={copy.less(offer.seller_name)}
                  moreLabel={copy.more(offer.seller_name)}
                  onChange={(quantity) => {
                    onLine({
                      offerId: offer.offer_id,
                      goodCode: good,
                      sellerName: offer.seller_name,
                      price: offer.price,
                      quantity,
                      available: offer.quantity,
                      imported: offer.imported,
                      tariff: offer.tariff,
                    });
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
