import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { cancelFxOffer } from '../../features/fx/api';
import { useMyFxOffers } from '../../features/fx/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The player's open offers (or the Central Bank's), each with a way to withdraw it. */
export function MyFxOffers({ asBank }: { asBank: boolean }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const offers = useMyFxOffers(asBank);
  const cancel = useGameAction((_, offerId: number) => cancelFxOffer(offerId), {
    refreshes: [['fx']],
  });
  const rows = offers.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="fx-mine-title">
      <h2 id="fx-mine-title" className="at-title-3">
        {asBank ? copy.mineBankTitle : copy.mineTitle}
      </h2>
      <ActionFeedback
        problem={cancel.problem}
        copy={copy}
        success={cancel.succeeded ? copy.cancelled : null}
      />
      {offers.isSuccess && rows.length === 0 ? <p className={styles.muted}>{copy.noMine}</p> : null}
      <ul className={styles.recipes}>
        {rows.map((offer) => {
          const line = `${copy.credit(countryName(offer.currency_code))} · ${copy.mineLine(
            copy[`side_${offer.side}`],
            formatMoney(offer.gold_amount, locale),
            formatMoney(offer.initial_gold_amount, locale),
            formatMoney(offer.price, locale),
          )}`;
          return (
            <li key={offer.offer_id}>
              <span>{line}</span>
              <Button
                variant="secondary"
                disabled={cancel.pending}
                aria-label={copy.cancelAria(line)}
                onClick={() => {
                  cancel.run(offer.offer_id);
                }}
              >
                {copy.cancel}
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
