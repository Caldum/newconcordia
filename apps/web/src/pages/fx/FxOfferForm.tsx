import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { postFxOffer } from '../../features/fx/api';
import type { NewFxOffer } from '../../features/fx/api';
import { fxLock } from '../../features/fx/rates';
import type { FxSide } from '../../features/fx/rates';
import { parseAmount } from '../../features/ledger/amount';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface FxOfferFormProps {
  currency: string;
  asBank: boolean;
}

/** Posting an offer to sell or buy GOLD at a price; the form shows what will be reserved. */
export function FxOfferForm({ currency, asBank }: FxOfferFormProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const sideId = useId();
  const [side, setSide] = useState<FxSide>('sell_gold');
  const [goldText, setGoldText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [checked, setChecked] = useState(false);
  const post = useGameAction((key, offer: NewFxOffer) => postFxOffer(offer, key), {
    refreshes: [['fx']],
    onSuccess: () => {
      setGoldText('');
      setPriceText('');
      setChecked(false);
    },
  });
  const gold = parseAmount(goldText);
  const price = parseAmount(priceText);

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    post.changed();
  };

  return (
    <Panel className={styles.panel} aria-labelledby="fx-form-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (gold === null || price === null) return;
          post.run({ currency, side, gold, price, centralBank: asBank });
        }}
      >
        <h2 id="fx-form-title" className="at-title-3">
          {copy.formTitle}
        </h2>
        <div className={styles.field}>
          <label htmlFor={sideId} className={styles.label}>
            {copy.side}
          </label>
          <select
            id={sideId}
            className={styles.select}
            value={side}
            onChange={(event) => {
              edit(() => {
                setSide(event.target.value as FxSide);
              });
            }}
          >
            <option value="sell_gold">{copy.side_sell_gold}</option>
            <option value="buy_gold">{copy.side_buy_gold}</option>
          </select>
        </div>
        <Field
          label={copy.gold}
          inputMode="decimal"
          autoComplete="off"
          value={goldText}
          onChange={(event) => {
            edit(() => {
              setGoldText(event.target.value);
            });
          }}
        />
        <Field
          label={copy.price}
          hint={copy.priceHint}
          inputMode="decimal"
          autoComplete="off"
          value={priceText}
          error={checked && (gold === null || price === null) ? copy.formInvalid : undefined}
          onChange={(event) => {
            edit(() => {
              setPriceText(event.target.value);
            });
          }}
        />
        {gold !== null && price !== null ? (
          <p className={styles.muted}>
            {side === 'sell_gold'
              ? copy.lockSell(formatMoney(gold, locale))
              : copy.lockBuy(formatMoney(fxLock(side, gold, price), locale))}
          </p>
        ) : null}
        <ActionFeedback
          problem={post.problem}
          copy={copy}
          success={post.succeeded ? copy.posted : null}
        />
        <div>
          <Button type="submit" disabled={post.pending}>
            {copy.post}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
