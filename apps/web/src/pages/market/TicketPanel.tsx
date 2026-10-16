import { Button } from '@concordia/atlas/Button';
import { Icon } from '@concordia/atlas/Icon';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { buyTicket } from '../../features/market/api';
import type { TicketPurchase } from '../../features/market/api';
import { ticketTotals } from '../../features/market/square';
import type { Ticket, TicketLine } from '../../features/market/square';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';

import market from './MarketPage.module.css';
import { messages } from './messages';
import { PurchaseDestination } from './PurchaseDestination';

interface TicketPanelProps {
  ticket: Ticket;
  /** The market's VAT, included in every price. */
  vat: number;
  onLine: (line: TicketLine) => void;
  onBought: () => void;
}

/** What the player is about to buy, from whom and at what price, and the purchase of all of it at once. */
export function TicketPanel({ ticket, vat, onLine, onBought }: TicketPanelProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const totals = ticketTotals(ticket, vat);
  const purchase = useGameAction((key, order: TicketPurchase) => buyTicket(order, key), {
    refreshes: [['market']],
    onSuccess: onBought,
  });
  const boughtUnits = purchase.variables?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;

  return (
    <Panel className={`${styles.panel} ${market.ticket}`} aria-labelledby="ticket-title">
      <h2 id="ticket-title" className="at-title-3">
        <Icon name="cart" size={20} /> {copy.ticket}
      </h2>
      {ticket.length === 0 ? (
        <p className={styles.muted}>{copy.ticketEmpty}</p>
      ) : (
        <ul className={market.ticketLines}>
          {ticket.map((line) => (
            <li key={line.offerId}>
              <span className={market.ticketGood}>
                <strong>{goodName(line.goodCode)}</strong>
                <span className="at-support">
                  {copy.ticketFrom(line.sellerName, line.quantity, formatMoney(line.price, locale))}
                </span>
              </span>
              <span className={market.ticketAmount}>
                {formatMoney(line.price * line.quantity, locale)}
              </span>
              <button
                type="button"
                className={market.remove}
                aria-label={copy.removeLine(goodName(line.goodCode), line.sellerName)}
                onClick={() => {
                  onLine({ ...line, quantity: 0 });
                  purchase.changed();
                }}
              >
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {ticket.length > 0 ? (
        <>
          <dl className={styles.lines}>
            <div>
              <dt>{copy.subtotal}</dt>
              <dd>{formatMoney(totals.gross, locale)}</dd>
            </div>
            <div>
              <dt>{copy.vatIncluded(formatPercent(vat, locale))}</dt>
              <dd>{formatMoney(totals.vat, locale)}</dd>
            </div>
            {totals.tariff > 0 ? (
              <div>
                <dt>{copy.tariff(formatPercent(ticket[0]?.tariff ?? 0, locale))}</dt>
                <dd>{formatMoney(totals.tariff, locale)}</dd>
              </div>
            ) : null}
            <div>
              <dt>{copy.total}</dt>
              <dd>{formatMoney(totals.total, locale)}</dd>
            </div>
          </dl>
          <PurchaseDestination
            companyId={companyId}
            onChange={(id) => {
              setCompanyId(id);
              purchase.changed();
            }}
          />
        </>
      ) : null}
      <ActionFeedback
        problem={purchase.problem}
        copy={copy}
        success={
          purchase.succeeded && typeof purchase.result === 'number'
            ? copy.boughtTicket(boughtUnits, formatMoney(purchase.result, locale))
            : null
        }
      />
      {ticket.length > 0 ? (
        <Button
          size="large"
          disabled={purchase.pending}
          onClick={() => {
            purchase.run({
              lines: ticket.map((line) => ({ offerId: line.offerId, quantity: line.quantity })),
              companyId,
            });
          }}
        >
          {copy.buyAll(totals.units)}
        </Button>
      ) : null}
    </Panel>
  );
}
