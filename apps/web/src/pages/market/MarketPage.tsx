import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';

import type { Citizen } from '../../features/auth/useCitizen';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { act, errorCode, problemText, useMyCompanies } from '../../features/economy/queries';
import { useActionKey } from '../../features/economy/useActionKey';
import { purchaseTotals, useMarketOffers, useMarketSummary } from '../../features/market/queries';
import type { MarketOffer, MarketSummary } from '../../features/market/queries';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import market from './MarketPage.module.css';
import { messages } from './messages';

/** `/market` (Market canvas): buy in the market of the player's country. */
export function MarketPage() {
  return (
    <CitizenOnly>
      {(citizen) => (
        <GameShell>
          <Market citizen={citizen} />
        </GameShell>
      )}
    </CitizenOnly>
  );
}

export function MarketTabs() {
  const copy = useMessages(messages);
  const current = {
    activeProps: { 'aria-current': 'page' as const },
    activeOptions: { exact: true },
  };
  return (
    <nav aria-label={copy.tabs} className={market.tabs}>
      <Link to="/market" {...current}>
        {copy.buyTab}
      </Link>
      <Link to="/market/sell" {...current}>
        {copy.sellTab}
      </Link>
    </nav>
  );
}

export function useCountryName() {
  const { locale } = useLocale();
  const world = useWorld();
  return (code: string) => {
    const country = world.data?.countries.get(code);
    if (!country) return code;
    return locale === 'es' ? country.name_es : country.name_en;
  };
}

function Market({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const countryName = useCountryName();
  const summary = useMarketSummary(citizen.country_code);
  const [good, setGood] = useState('ration');
  const rows = summary.data ?? [];
  const current = rows.find((row) => row.good_code === good);

  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        {current ? (
          <p className="at-body-l">
            {copy.intro(formatPercent(current.vat, locale), formatPercent(current.tariff, locale))}
          </p>
        ) : null}
      </div>
      {summary.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <section aria-label={copy.goods} className={market.goods}>
        {rows.map((row) => (
          <button
            key={row.good_code}
            type="button"
            className={market.good}
            aria-pressed={row.good_code === good}
            onClick={() => {
              setGood(row.good_code);
            }}
          >
            <strong>{goodName(row.good_code)}</strong>{' '}
            <span>
              {row.best_price === null ? copy.none : copy.from(formatMoney(row.best_price, locale))}
            </span>
          </button>
        ))}
      </section>
      {current ? <Offers key={good} citizen={citizen} summary={current} /> : null}
    </main>
  );
}

function Offers({ citizen, summary }: { citizen: Citizen; summary: MarketSummary }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const countryName = useCountryName();
  const offers = useMarketOffers(citizen.country_code, summary.good_code);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const rows = offers.data ?? [];
  const chosen = rows.find((offer) => offer.offer_id === chosenId) ?? rows[0] ?? null;
  const fee = formatPercent(summary.fee, locale);

  return (
    <div className={styles.layout}>
      <Panel className={styles.panel} aria-labelledby="offers-title">
        <h2 id="offers-title" className="at-title-3">
          {copy.offers(goodName(summary.good_code))}
        </h2>
        {offers.isSuccess && rows.length === 0 ? <p>{copy.noOffers}</p> : null}
        {rows.length > 0 ? (
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
                {rows.map((offer) => {
                  const selected = offer.offer_id === chosen?.offer_id;
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
                            setChosenId(offer.offer_id);
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
        ) : null}
        <p className={styles.muted}>
          {summary.average_24h === null
            ? copy.noAverage(fee)
            : copy.average(formatMoney(summary.average_24h, locale), fee)}
        </p>
      </Panel>
      {chosen ? (
        <Purchase key={chosen.offer_id} offer={chosen} summary={summary} />
      ) : (
        <Panel className={styles.panel}>
          <p>{copy.pickOffer}</p>
        </Panel>
      )}
    </div>
  );
}

function Purchase({ offer, summary }: { offer: MarketOffer; summary: MarketSummary }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const companies = useMyCompanies();
  const queryClient = useQueryClient();
  const destinationId = useId();
  const [key, renewKey] = useActionKey();
  const [quantityText, setQuantityText] = useState('1');
  const [destination, setDestination] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [bought, setBought] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const quantity = /^\d{1,6}$/.test(quantityText.trim()) ? Number(quantityText.trim()) : 0;
  const valid = quantity > 0;
  const totals = purchaseTotals(offer.price, quantity, summary.vat, offer.tariff, offer.imported);
  const good = goodName(summary.good_code);

  const buy = async () => {
    if (!valid) return;
    setPending(true);
    setProblem(null);
    setBought(null);
    try {
      const paid = await act(
        supabase.rpc('buy', {
          p_offer_id: offer.offer_id,
          p_quantity: quantity,
          ...(destination ? { p_company_id: Number(destination) } : {}),
          p_key: key,
        }),
      );
      setBought(copy.bought(quantity, good, formatMoney(paid ?? totals.total, locale)));
      renewKey();
    } catch (error) {
      setProblem(errorCode(error));
    } finally {
      setPending(false);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['market'] });
    }
  };

  return (
    <Panel className={styles.panel} aria-labelledby="buy-title">
      <h2 id="buy-title" className="at-title-3">
        {copy.buyTitle(good)}
      </h2>
      <p className={styles.muted}>
        {copy.buyFrom(offer.seller_name, formatMoney(offer.price, locale))}
      </p>
      <Field
        label={copy.quantity}
        value={quantityText}
        inputMode="numeric"
        autoComplete="off"
        error={valid ? undefined : copy.quantityInvalid}
        onChange={(event) => {
          setQuantityText(event.target.value);
          renewKey();
        }}
      />
      <div className={styles.field}>
        <label htmlFor={destinationId} className={styles.label}>
          {copy.destination}
        </label>
        <select
          id={destinationId}
          className={styles.select}
          value={destination}
          onChange={(event) => {
            setDestination(event.target.value);
            renewKey();
          }}
        >
          <option value="">{copy.inventory}</option>
          {companies.data?.map((company) => (
            <option key={company.id} value={String(company.id)}>
              {copy.depot(company.name)}
            </option>
          ))}
        </select>
      </div>
      <dl className={styles.lines}>
        <div>
          <dt>{copy.subtotal}</dt>
          <dd>{formatMoney(totals.gross, locale)}</dd>
        </div>
        <div>
          <dt>{copy.vatIncluded(formatPercent(summary.vat, locale))}</dt>
          <dd>{formatMoney(totals.vat, locale)}</dd>
        </div>
        {offer.imported ? (
          <div>
            <dt>{copy.tariff(formatPercent(offer.tariff, locale))}</dt>
            <dd>{formatMoney(totals.tariff, locale)}</dd>
          </div>
        ) : null}
        <div>
          <dt>{copy.total}</dt>
          <dd>{formatMoney(totals.total, locale)}</dd>
        </div>
      </dl>
      {problem ? <Note tone="error">{problemText(copy, problem)}</Note> : null}
      <div role="status">{bought ? <Note tone="ok">{bought}</Note> : null}</div>
      <div>
        <Button size="large" disabled={pending || !valid} onClick={() => void buy()}>
          {copy.buy(quantity)}
        </Button>
      </div>
    </Panel>
  );
}
