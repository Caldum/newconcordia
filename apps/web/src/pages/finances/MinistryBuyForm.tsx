import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { ministryBuy } from '../../features/finance/api';
import type { MinistryPurchase } from '../../features/finance/api';
import { useMarketOffers } from '../../features/market/queries';
import { parseUnits } from '../../features/market/units';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The minister buys a good of the ministry's competence from an offer on the national market. */
export function MinistryBuyForm({ goods }: { goods: readonly string[] }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const goodName = useGoodName();
  const goodId = useId();
  const offerId = useId();
  const [good, setGood] = useState(goods[0] ?? '');
  const [chosen, setChosen] = useState<number | null>(null);
  const [quantityText, setQuantityText] = useState('');
  const [checked, setChecked] = useState(false);
  const offers = useMarketOffers(citizen.country_code, good).data ?? [];
  const offer = offers.find((o) => o.offer_id === chosen) ?? offers[0] ?? null;
  const quantity = parseUnits(quantityText);
  const buy = useGameAction((key, purchase: MinistryPurchase) => ministryBuy(purchase, key), {
    refreshes: [['finances'], ['market']],
    onSuccess: () => {
      setQuantityText('');
      setChecked(false);
    },
  });

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    buy.changed();
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (!offer || quantity <= 0) return;
        buy.run({ offerId: offer.offer_id, quantity });
      }}
    >
      <h3 className="at-title-3">{copy.buyTitle}</h3>
      <p className={styles.muted}>{copy.buyHint}</p>
      <div className={styles.field}>
        <label htmlFor={goodId} className={styles.label}>
          {copy.good}
        </label>
        <select
          id={goodId}
          className={styles.select}
          value={good}
          onChange={(event) => {
            edit(() => {
              setGood(event.target.value);
              setChosen(null);
            });
          }}
        >
          {goods.map((code) => (
            <option key={code} value={code}>
              {goodName(code)}
            </option>
          ))}
        </select>
      </div>
      {offers.length === 0 ? (
        <p className={styles.muted}>{copy.noOffers}</p>
      ) : (
        <div className={styles.field}>
          <label htmlFor={offerId} className={styles.label}>
            {copy.offer}
          </label>
          <select
            id={offerId}
            className={styles.select}
            value={offer?.offer_id ?? ''}
            onChange={(event) => {
              edit(() => {
                setChosen(Number(event.target.value));
              });
            }}
          >
            {offers.map((o) => (
              <option key={o.offer_id} value={o.offer_id}>
                {copy.offerLabel(o.seller_name, formatMoney(o.price, locale), o.quantity)}
              </option>
            ))}
          </select>
        </div>
      )}
      <Field
        label={copy.quantity}
        inputMode="numeric"
        autoComplete="off"
        value={quantityText}
        error={checked && quantity <= 0 ? copy.quantityInvalid : undefined}
        onChange={(event) => {
          edit(() => {
            setQuantityText(event.target.value);
          });
        }}
      />
      <ActionFeedback
        problem={buy.problem}
        copy={copy}
        success={
          buy.succeeded && typeof buy.result === 'number'
            ? copy.bought(formatMoney(buy.result, locale))
            : null
        }
      />
      <div>
        <Button type="submit" disabled={buy.pending || !offer}>
          {copy.buy}
        </Button>
      </div>
    </form>
  );
}
