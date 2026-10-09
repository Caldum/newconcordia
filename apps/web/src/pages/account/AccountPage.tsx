import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { CreditIcon, GoldIcon } from '@concordia/atlas/GameIcons';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Segmented } from '@concordia/atlas/Segmented';
import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';

import type { Citizen } from '../../features/auth/useCitizen';
import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { InventoryPanel } from '../../features/inventory/InventoryPanel';
import { parseAmount } from '../../features/ledger/amount';
import { transferMoney, useBalances, useMovements } from '../../features/ledger/queries';
import type { Balance, Movement } from '../../features/ledger/queries';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { formatDateTime, formatMoney, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './AccountPage.module.css';
import { messages } from './messages';

/** `/account`: balances, transfers and the statement (Inventory canvas, account part). */
export function AccountPage() {
  return (
    <CitizenOnly>
      {(citizen) => (
        <GameShell>
          <Account citizen={citizen} />
        </GameShell>
      )}
    </CitizenOnly>
  );
}

/** Names a currency the way the player reads it: «Oro», «Crédito de Argentina». */
function useCurrencyNames() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const world = useWorld();
  const country = (code: string) => {
    const found = world.data?.countries.get(code);
    if (!found) return code;
    return locale === 'es' ? found.name_es : found.name_en;
  };
  return {
    country,
    currency: (code: string) => (code === 'GOLD' ? copy.gold : copy.credit(country(code))),
  };
}

function Account({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const balances = useBalances();

  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {balances.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {balances.data ? (
        <>
          <Balances balances={balances.data} citizen={citizen} />
          <InventoryPanel />
          <div className={styles.layout}>
            <Movements balances={balances.data} citizen={citizen} />
            <TransferForm balances={balances.data} citizen={citizen} />
          </div>
        </>
      ) : null}
    </main>
  );
}

function Balances({ balances, citizen }: { balances: Balance[]; citizen: Citizen }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const names = useCurrencyNames();
  return (
    <section aria-label={copy.balances} className={styles.balances}>
      {balances.map((balance) => (
        <BalanceCard
          key={balance.currency_code}
          gold={balance.currency_code === 'GOLD'}
          label={names.currency(balance.currency_code)}
          value={formatMoney(balance.balance, locale)}
          note={
            balance.currency_code === 'GOLD'
              ? copy.goldNote
              : balance.currency_code === citizen.country_code
                ? copy.ownCreditNote(names.country(balance.currency_code))
                : copy.otherCreditNote(names.country(balance.currency_code))
          }
        />
      ))}
    </section>
  );
}

function BalanceCard({
  gold,
  label,
  value,
  note,
}: {
  gold: boolean;
  label: string;
  value: string;
  note: string;
}) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className={styles.balance}>
      <span id={labelId} className={styles.balanceLabel}>
        {gold ? <GoldIcon /> : <CreditIcon />}
        {label}
      </span>
      <span className="at-figure">{value}</span>
      <span className={styles.note}>{note}</span>
    </div>
  );
}

type Problem =
  | 'insufficient_funds'
  | 'recipient_not_found'
  | 'recipient_is_sender'
  | 'rate_limited'
  | 'memo_too_long'
  | 'amount_invalid'
  | 'other';

const knownProblems = new Set<string>([
  'insufficient_funds',
  'recipient_not_found',
  'recipient_is_sender',
  'rate_limited',
  'memo_too_long',
  'amount_invalid',
]);

function problemOf(error: unknown): Problem {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && knownProblems.has(message) ? (message as Problem) : 'other';
}

function TransferForm({ balances, citizen }: { balances: Balance[]; citizen: Citizen }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const names = useCurrencyNames();
  const queryClient = useQueryClient();
  const currencyId = useId();
  const [toName, setToName] = useState('');
  const [currency, setCurrency] = useState(citizen.country_code);
  const [amountText, setAmountText] = useState('');
  const [memo, setMemo] = useState('');
  // One key per request: retrying the same transfer reuses it, so the database never pays it twice.
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [checked, setChecked] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const amount = parseAmount(amountText);
  const recipient = toName.trim();
  const edit = (apply: () => void) => {
    apply();
    setKey(crypto.randomUUID());
    setProblem(null);
    setSent(null);
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    setSent(null);
    if (!recipient || amount === null) return;
    setPending(true);
    setProblem(null);
    try {
      await transferMoney({ toName: recipient, currency, amount, memo: memo.trim(), key });
      setSent(copy.sent(formatMoney(amount, locale), names.currency(currency), recipient));
      setToName('');
      setAmountText('');
      setMemo('');
      setChecked(false);
      setKey(crypto.randomUUID());
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (error) {
      setProblem(problemOf(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel className={styles.panel} aria-labelledby="transfer-title">
      <h2 id="transfer-title" className="at-title-3">
        {copy.transferTitle}
      </h2>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        <Field
          label={copy.recipient}
          hint={copy.recipientHint}
          error={checked && !recipient ? copy.recipientMissing : undefined}
          value={toName}
          autoComplete="off"
          onChange={(event) => {
            edit(() => {
              setToName(event.target.value);
            });
          }}
        />
        <div className={styles.field}>
          <label htmlFor={currencyId} className={styles.label}>
            {copy.currency}
          </label>
          <select
            id={currencyId}
            className={styles.select}
            value={currency}
            onChange={(event) => {
              edit(() => {
                setCurrency(event.target.value);
              });
            }}
          >
            {balances.map((balance) => (
              <option key={balance.currency_code} value={balance.currency_code}>
                {`${names.currency(balance.currency_code)} · ${formatMoney(balance.balance, locale)}`}
              </option>
            ))}
          </select>
        </div>
        <Field
          label={copy.amount}
          hint={copy.amountHint}
          error={checked && amount === null ? copy.amountInvalid : undefined}
          value={amountText}
          inputMode="decimal"
          autoComplete="off"
          onChange={(event) => {
            edit(() => {
              setAmountText(event.target.value);
            });
          }}
        />
        <Field
          label={copy.memo}
          hint={copy.memoHint}
          value={memo}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => {
            edit(() => {
              setMemo(event.target.value);
            });
          }}
        />
        {problem ? <Note tone="error">{copy[`error_${problem}`]}</Note> : null}
        <div role="status">{sent ? <Note tone="ok">{sent}</Note> : null}</div>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? copy.sending : copy.transfer}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function Movements({ balances, citizen }: { balances: Balance[]; citizen: Citizen }) {
  const copy = useMessages(messages);
  const names = useCurrencyNames();
  const [currency, setCurrency] = useState<string>('all');
  const movements = useMovements(currency === 'all' ? null : currency);
  const rows = movements.data?.pages.flat() ?? [];
  // Segmented takes up to 4 options: everything, Gold, the player's Credit and one more.
  const segments = [
    { value: 'all', label: copy.all },
    ...balances.slice(0, 3).map((balance) => ({
      value: balance.currency_code,
      label: names.currency(balance.currency_code),
    })),
  ];

  return (
    <Panel className={styles.panel} aria-labelledby="movements-title">
      <div className={styles.panelHead}>
        <h2 id="movements-title" className="at-title-3">
          {copy.movements}
        </h2>
        <Segmented
          label={copy.filter}
          segments={segments}
          value={currency}
          onChange={setCurrency}
        />
      </div>
      {movements.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {movements.isSuccess && rows.length === 0 ? <p>{copy.noMovements}</p> : null}
      {rows.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-labelledby="movements-title">
            <thead>
              <tr>
                <th scope="col">{copy.when}</th>
                <th scope="col">{copy.concept}</th>
                <th scope="col">{copy.counterparty}</th>
                <th scope="col" className={styles.number}>
                  {copy.amountColumn}
                </th>
                <th scope="col" className={styles.number}>
                  {copy.balanceColumn}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((movement) => (
                <MovementRow key={movement.posting_id} movement={movement} citizen={citizen} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {movements.hasNextPage ? (
        <div>
          <Button
            variant="secondary"
            disabled={movements.isFetchingNextPage}
            onClick={() => void movements.fetchNextPage()}
          >
            {copy.more}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}

function MovementRow({ movement, citizen }: { movement: Movement; citizen: Citizen }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const names = useCurrencyNames();
  const kind =
    movement.kind === 'welcome_grant'
      ? copy.kind_welcome_grant
      : movement.kind === 'transfer'
        ? copy.kind_transfer
        : copy.kind_other;
  const counterparty =
    movement.counterparty_kind === 'citizen'
      ? (movement.counterparty_name ?? '')
      : movement.counterparty_kind === 'treasury'
        ? copy.treasury(names.country(movement.counterparty_country_code ?? movement.currency_code))
        : movement.counterparty_kind === 'sink'
          ? copy.sink
          : movement.currency_code === 'GOLD'
            ? copy.gameIssuer
            : copy.countryIssuer(names.country(movement.currency_code));
  // The player's own Credit goes bare, as on the canvas; Gold and other Credits name their unit.
  const unit =
    movement.currency_code === citizen.country_code
      ? ''
      : movement.currency_code === 'GOLD'
        ? ` ${copy.goldUnit}`
        : ` ${movement.currency_code}`;

  return (
    <tr>
      <td>{formatDateTime(movement.created_at, locale)}</td>
      <td>{movement.memo ?? kind}</td>
      <td>{counterparty}</td>
      <td className={styles.number}>
        {formatMoney(movement.amount, locale, { signed: true }) + unit}
      </td>
      <td className={styles.number}>{formatMoney(movement.balance_after, locale) + unit}</td>
    </tr>
  );
}
