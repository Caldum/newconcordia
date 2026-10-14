import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useFxBook } from '../../features/fx/queries';
import { useMessages } from '../../i18n';

import { FxOfferItem } from './FxOfferItem';
import { messages } from './messages';

interface FxBookProps {
  currency: string;
  /** The governor trades with the Central Bank's funds. */
  asBank: boolean;
}

/** Both sides of a pair: GOLD for sale cheapest first, GOLD wanted dearest first. */
export function FxBook({ currency, asBank }: FxBookProps) {
  const copy = useMessages(messages);
  const book = useFxBook(currency);
  const offers = book.data ?? [];
  const side = (which: 'sell_gold' | 'buy_gold', title: string, id: string) => {
    const rows = offers.filter((offer) => offer.side === which);
    return (
      <Panel className={styles.panel} aria-labelledby={id}>
        <h2 id={id} className="at-title-3">
          {title}
        </h2>
        {book.isSuccess && rows.length === 0 ? (
          <p className={styles.muted}>{copy.noOffers}</p>
        ) : null}
        <ul className={styles.recipes}>
          {rows.map((offer) => (
            <FxOfferItem key={offer.offer_id} offer={offer} asBank={asBank} />
          ))}
        </ul>
      </Panel>
    );
  };

  return (
    <>
      {side('sell_gold', copy.sellsTitle, 'fx-sells-title')}
      {side('buy_gold', copy.buysTitle, 'fx-buys-title')}
    </>
  );
}
