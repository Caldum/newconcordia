import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { takeFxOffer } from '../../features/fx/api';
import type { FxTake } from '../../features/fx/api';
import type { FxBookOffer } from '../../features/fx/queries';
import { parseAmount } from '../../features/ledger/amount';
import { useCountryName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface FxOfferItemProps {
  offer: FxBookOffer;
  asBank: boolean;
}

/** One offer of the book and, unless it is the player's, a field to take part of it. */
export function FxOfferItem({ offer, asBank }: FxOfferItemProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const [goldText, setGoldText] = useState('');
  const [checked, setChecked] = useState(false);
  const take = useGameAction((key, request: FxTake) => takeFxOffer(request, key), {
    refreshes: [['fx']],
    onSuccess: () => {
      setGoldText('');
      setChecked(false);
    },
  });
  const owner = offer.is_central_bank ? copy.bank(countryName(offer.owner_name)) : offer.owner_name;
  const gold = parseAmount(goldText);

  return (
    <li>
      <span>
        {copy.offerLine(
          owner,
          formatMoney(offer.gold_amount, locale),
          formatMoney(offer.price, locale),
        )}
        {offer.mine ? ` · ${copy.yours}` : null}
        <ActionFeedback
          problem={take.problem}
          copy={copy}
          success={
            take.succeeded && typeof take.result === 'number'
              ? copy.took(formatMoney(take.result, locale))
              : null
          }
        />
      </span>
      {offer.mine && !asBank ? null : (
        <form
          className={styles.inline}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setChecked(true);
            if (gold === null) return;
            take.run({ offerId: offer.offer_id, gold, centralBank: asBank });
          }}
        >
          <Field
            label={copy.takeLabel(owner)}
            inputMode="decimal"
            autoComplete="off"
            value={goldText}
            error={checked && gold === null ? copy.takeInvalid : undefined}
            onChange={(event) => {
              setGoldText(event.target.value);
              take.changed();
            }}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={take.pending}
            aria-label={copy.takeAria(owner)}
          >
            {copy.take}
          </Button>
        </form>
      )}
    </li>
  );
}
