import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';
import { z } from 'zod';

import { useAuth } from '../../features/auth/AuthProvider';
import type { Citizen } from '../../features/auth/useCitizen';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { act, errorCode, problemText, useMyCompanies } from '../../features/economy/queries';
import { useActionKey } from '../../features/economy/useActionKey';
import { parseAmount } from '../../features/ledger/amount';
import {
  saleTotals,
  useMarketSummary,
  useMyInventory,
  useMyOffers,
} from '../../features/market/queries';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { formatMoney, formatNumber, formatPercent, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { MarketTabs, useCountryName } from './MarketPage';
import { messages } from './messages';

/** `/market/sell` (Sell canvas). */
export function SellPage() {
  return (
    <CitizenOnly>
      {(citizen) => (
        <GameShell>
          <Sell citizen={citizen} />
        </GameShell>
      )}
    </CitizenOnly>
  );
}

interface Source {
  id: string;
  good: string;
  /** Whole units that can be offered. */
  available: number;
  companyId: number | null;
  label: string;
}

const stockSchema = z.array(z.object({ good_code: z.string(), quantity: z.number() }));

/** Every place the player can sell from: their inventory and each company's depot. */
function useSources(): Source[] {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : '';
  const inventory = useMyInventory();
  const companies = useMyCompanies();
  const stocks = useQueries({
    queries: (companies.data ?? []).map((company) => ({
      queryKey: ['me', userId, 'companies', company.id, 'stock'],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_company_stock', {
          p_company_id: company.id,
        });
        if (error) throw error as Error;
        return stockSchema.parse(data);
      },
    })),
  });
  const sources: Source[] = [];
  for (const line of inventory.data ?? []) {
    const available = Math.floor(line.quantity);
    if (available > 0) {
      sources.push({
        id: `inventory:${line.good_code}`,
        good: line.good_code,
        available,
        companyId: null,
        label: copy.fromInventory(goodName(line.good_code), formatNumber(available, locale)),
      });
    }
  }
  (companies.data ?? []).forEach((company, index) => {
    for (const line of stocks[index]?.data ?? []) {
      const available = Math.floor(line.quantity);
      if (available > 0) {
        sources.push({
          id: `company:${String(company.id)}:${line.good_code}`,
          good: line.good_code,
          available,
          companyId: company.id,
          label: copy.fromCompany(
            goodName(line.good_code),
            formatNumber(available, locale),
            company.name,
          ),
        });
      }
    }
  });
  return sources;
}

function Sell({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  useDocumentTitle(copy.sellDocumentTitle);
  const countryName = useCountryName();
  const sources = useSources();
  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.sellTitle}</h1>
        <p className="at-body-l">{copy.sellIntro(countryName(citizen.country_code))}</p>
      </div>
      <div className={styles.layout}>
        {sources.length > 0 ? (
          <SellForm citizen={citizen} sources={sources} />
        ) : (
          <Panel className={styles.panel}>
            <p>{copy.nothingToSell}</p>
          </Panel>
        )}
        <MyOffers />
      </div>
    </main>
  );
}

function SellForm({ citizen, sources }: { citizen: Citizen; sources: Source[] }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const summary = useMarketSummary(citizen.country_code);
  const queryClient = useQueryClient();
  const sourceId = useId();
  const [key, renewKey] = useActionKey();
  const [selected, setSelected] = useState(sources[0]?.id ?? '');
  const [quantityText, setQuantityText] = useState('1');
  const [priceText, setPriceText] = useState('');
  const [checked, setChecked] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [pending, setPending] = useState(false);

  const source = sources.find((item) => item.id === selected) ?? sources[0];
  const quantity = /^\d{1,6}$/.test(quantityText.trim()) ? Number(quantityText.trim()) : 0;
  const price = parseAmount(priceText);
  const market = summary.data?.find((row) => row.good_code === source?.good);
  const totals = saleTotals(price ?? 0, quantity, market?.vat ?? 0, market?.fee ?? 0);
  const validQuantity = source !== undefined && quantity > 0 && quantity <= source.available;
  const edit = (apply: () => void) => {
    apply();
    renewKey();
    setPublished(false);
    setProblem(null);
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    if (!source || !validQuantity || price === null) return;
    setPending(true);
    try {
      await act(
        supabase.rpc('post_offer', {
          p_good_code: source.good,
          p_quantity: quantity,
          p_price: price,
          ...(source.companyId === null ? {} : { p_company_id: source.companyId }),
          p_market_country_code: citizen.country_code,
          p_key: key,
        }),
      );
      setPublished(true);
      setChecked(false);
      renewKey();
    } catch (error) {
      setProblem(errorCode(error));
    } finally {
      setPending(false);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['market'] });
    }
  };

  const average = market?.average_24h ?? null;
  const comparison =
    average !== null && price !== null && price !== average
      ? price > average
        ? copy.aboveAverage(formatPercent(price / average - 1, locale))
        : copy.belowAverage(formatPercent(1 - price / average, locale))
      : undefined;

  return (
    <Panel className={styles.panel} aria-labelledby="sell-title">
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        <h2 id="sell-title" className="at-title-3">
          {copy.what}
        </h2>
        <div className={styles.field}>
          <label htmlFor={sourceId} className={styles.label}>
            {copy.what}
          </label>
          <select
            id={sourceId}
            className={styles.select}
            value={source?.id ?? ''}
            onChange={(event) => {
              edit(() => {
                setSelected(event.target.value);
              });
            }}
          >
            {sources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Field
          label={copy.quantity}
          value={quantityText}
          inputMode="numeric"
          autoComplete="off"
          error={checked && !validQuantity ? copy.quantityInvalid : undefined}
          onChange={(event) => {
            edit(() => {
              setQuantityText(event.target.value);
            });
          }}
        />
        <Field
          label={copy.unitPrice}
          hint={comparison ?? copy.unitPriceHint}
          value={priceText}
          inputMode="decimal"
          autoComplete="off"
          error={checked && price === null ? copy.error_amount_invalid : undefined}
          onChange={(event) => {
            edit(() => {
              setPriceText(event.target.value);
            });
          }}
        />
        <h3 className="at-title-3">{copy.ifAllSells}</h3>
        <dl className={styles.lines}>
          <div>
            <dt>{copy.totalPrice}</dt>
            <dd>{formatMoney(totals.gross, locale)}</dd>
          </div>
          <div>
            <dt>{copy.vatToTreasury(formatPercent(market?.vat ?? 0, locale))}</dt>
            <dd>{formatMoney(-totals.vat, locale)}</dd>
          </div>
          <div>
            <dt>{copy.marketFee(formatPercent(market?.fee ?? 0, locale))}</dt>
            <dd>{formatMoney(-totals.fee, locale)}</dd>
          </div>
          <div>
            <dt>{copy.youReceive}</dt>
            <dd>{formatMoney(totals.net, locale)}</dd>
          </div>
        </dl>
        {problem ? <Note tone="error">{problemText(copy, problem)}</Note> : null}
        <div role="status">{published ? <Note tone="ok">{copy.published}</Note> : null}</div>
        <div>
          <Button type="submit" size="large" disabled={pending}>
            {copy.publish}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function MyOffers() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const offers = useMyOffers();
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState<string | null>(null);
  const rows = offers.data ?? [];
  return (
    <Panel className={styles.panel} aria-labelledby="my-offers-title">
      <h2 id="my-offers-title" className="at-title-3">
        {copy.myOffers}
      </h2>
      {problem ? <Note tone="error">{problemText(copy, problem)}</Note> : null}
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
              aria-label={copy.withdrawLabel(goodName(offer.good_code))}
              onClick={() => {
                setProblem(null);
                void act(supabase.rpc('withdraw_offer', { p_offer_id: offer.offer_id }))
                  .catch((error: unknown) => {
                    setProblem(errorCode(error));
                  })
                  .finally(() => {
                    void queryClient.invalidateQueries({ queryKey: ['me'] });
                    void queryClient.invalidateQueries({ queryKey: ['market'] });
                  });
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
