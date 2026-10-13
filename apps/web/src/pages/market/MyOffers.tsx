import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { withdrawOffer } from '../../features/market/api';
import { useMyOffers } from '../../features/market/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The player's open offers, with what each has sold, and withdrawing them. */
export function MyOffers() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const offers = useMyOffers();
  const withdraw = useGameAction((_, offerId: number) => withdrawOffer(offerId), {
    refreshes: [['market']],
  });
  const rows = offers.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="my-offers-title">
      <h2 id="my-offers-title" className="at-title-3">
        {copy.myOffers}
      </h2>
      <ActionFeedback problem={withdraw.problem} copy={copy} />
      {offers.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noMyOffers}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((offer) => (
          <li key={offer.offer_id}>
            <span>
              {copy.myOffer(
                offer.quantity,
                goodName(offer.good_code),
                formatMoney(offer.price, locale),
                offer.sold,
              )}
            </span>
            <Button
              variant="ghost"
              disabled={withdraw.pending}
              aria-label={copy.withdrawLabel(goodName(offer.good_code))}
              onClick={() => {
                withdraw.run(offer.offer_id);
              }}
            >
              {copy.withdraw}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
