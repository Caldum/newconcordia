import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { setGoldPrice } from '../../features/admin/api';
import type { GoldPriceChange } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import {
  formatShare,
  goldText,
  parseGold,
  parsePercent,
  percentText,
  splitPrice,
} from '../../features/admin/goldSplit';
import { consoleMessages } from '../../features/admin/messages';
import type { GoldPrice } from '../../features/admin/queries';
import { formatDateTime, formatMoney, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { goldMessages } from './goldMessages';

/** One GOLD payment: its price, the country's share with the split it makes, and saving both with a reason. */
export function GoldPriceItem({ price }: { price: GoldPrice }) {
  const copy = useMessages(goldMessages);
  const shared = useMessages(consoleMessages);
  const { locale } = useLocale();
  const [priceText, setPriceText] = useState(() => goldText(price.price, locale));
  const [shareText, setShareText] = useState(() => percentText(price.country_share_bp, locale));
  const [reason, setReason] = useState('');
  const save = useGameAction((_, change: GoldPriceChange) => setGoldPrice(change), {
    onSuccess: () => {
      setReason('');
    },
  });
  const typedPrice = parseGold(priceText);
  const statePays = price.beneficiary === 'none';
  const typedShare = statePays ? 0 : parsePercent(shareText);
  const gold = (hundredths: number) =>
    hundredths === 0 ? copy.free : shared.goldAmount(formatMoney(hundredths, locale));
  const split =
    typedPrice === null || typedShare === null
      ? null
      : splitPrice(typedPrice, typedShare, price.beneficiary);
  const name = copy[`price_${price.key}` as keyof typeof copy];
  const label = typeof name === 'string' ? name : price.key;
  const changed = () => {
    save.changed();
  };

  return (
    <li>
      <div>
        <strong>{label}</strong>
        <br />
        <span className={styles.meta}>
          {copy[`beneficiary_${price.beneficiary}`]}{' '}
          {statePays ? null : `(${formatShare(price.country_share_bp, locale)})`} ·{' '}
          {copy.updated(formatDateTime(price.updated_at, locale), price.updated_by)}
        </span>
      </div>
      <form
        className={styles.row}
        noValidate
        aria-label={label}
        onSubmit={(event) => {
          event.preventDefault();
          if (typedPrice === null || typedShare === null) return;
          save.run({
            key: price.key,
            price: typedPrice,
            shareBp: typedShare,
            reason: reason.trim(),
          });
        }}
      >
        <Field
          label={copy.price}
          inputMode="decimal"
          autoComplete="off"
          value={priceText}
          hint={price.min_price > 0 ? copy.minimum(gold(price.min_price)) : undefined}
          error={typedPrice === null ? copy.invalidPrice : undefined}
          onChange={(event) => {
            setPriceText(event.target.value);
            changed();
          }}
        />
        {statePays ? null : (
          <Field
            label={copy.share}
            inputMode="decimal"
            autoComplete="off"
            value={shareText}
            error={typedShare === null ? copy.invalidShare : undefined}
            onChange={(event) => {
              setShareText(event.target.value);
              changed();
            }}
          />
        )}
        <Field
          label={copy.reason}
          autoComplete="off"
          maxLength={300}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            changed();
          }}
        />
        <Button type="submit" disabled={save.pending || typedPrice === null || typedShare === null}>
          {copy.save}
        </Button>
      </form>
      {split ? (
        <span className={styles.split} aria-live="polite">
          {copy.split(gold(split.country), gold(split.game))}
        </span>
      ) : null}
      <ConsoleFeedback
        problem={save.problem}
        copy={copy}
        success={save.succeeded ? copy.saved : null}
      />
    </li>
  );
}
