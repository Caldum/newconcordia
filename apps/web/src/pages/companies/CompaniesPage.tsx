import { Button, buttonClassName } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { useGoodName } from '../../features/economy/goods';
import {
  act,
  errorCode,
  problemText,
  useCompanyEmployees,
  useCompanyStock,
  useMyCompanies,
} from '../../features/economy/queries';
import type { Company } from '../../features/economy/queries';
import { useActionKey } from '../../features/economy/useActionKey';
import { amountInput, parseAmount } from '../../features/ledger/amount';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { formatMoney, formatNumber, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

/** `/companies` (Company canvas): every company the player owns. */
export function CompaniesPage() {
  return (
    <CitizenOnly>
      {() => (
        <GameShell>
          <Companies />
        </GameShell>
      )}
    </CitizenOnly>
  );
}

function Companies() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const companies = useMyCompanies();
  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {companies.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {companies.data?.length === 0 ? (
        <Panel className={styles.panel}>
          <p>{copy.none}</p>
          <div>
            <Link to="/companies/new" className={buttonClassName({})}>
              {copy.found}
            </Link>
          </div>
        </Panel>
      ) : null}
      {companies.data?.map((company) => (
        <CompanyPanel key={company.id} company={company} />
      ))}
    </main>
  );
}

function CompanyPanel({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const goodName = useGoodName();
  const world = useWorld();
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const titleId = useId();

  const run = async (
    call: PromiseLike<{ data: unknown; error: unknown }>,
    message: string = copy.done,
  ) => {
    setProblem(null);
    setDone(null);
    try {
      await act(call);
      setDone(message);
      return true;
    } catch (error) {
      setProblem(errorCode(error));
      return false;
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  };

  return (
    <Panel className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.panelHead}>
        <div>
          <h2 id={titleId} className="at-title-2">
            {company.name}
          </h2>
          <p className={styles.muted}>
            {`${goodName(company.good_code)} · ${world.data?.regions.get(company.region_code)?.name ?? company.region_code} · ${copy.level(company.level, company.capacity)}`}
          </p>
        </div>
        <Upgrades company={company} run={run} />
      </div>
      {problem ? <Note tone="error">{problemText(copy, problem)}</Note> : null}
      <div role="status">{done ? <Note tone="ok">{done}</Note> : null}</div>
      <div className={styles.layout}>
        <div className={styles.column}>
          <Employees companyId={company.id} />
          <Stock company={company} />
        </div>
        <div className={styles.column}>
          <Cash company={company} run={run} />
          <Offer company={company} run={run} />
        </div>
      </div>
    </Panel>
  );
}

type Run = (
  call: PromiseLike<{ data: unknown; error: unknown }>,
  message?: string,
) => Promise<boolean>;

function Upgrades({ company, run }: { company: Company; run: Run }) {
  const copy = useMessages(messages);
  const [levelKey, renewLevelKey] = useActionKey();
  const [qualityKey, renewQualityKey] = useActionKey();
  const quality = /^weapon_q([1-5])$/.exec(company.good_code);
  return (
    <div className={styles.actions}>
      {company.next_level_gold !== null ? (
        <Button
          variant="secondary"
          onClick={() =>
            void run(
              supabase.rpc('upgrade_company', { p_company_id: company.id, p_key: levelKey }),
            ).then((ok) => {
              if (ok) renewLevelKey();
            })
          }
        >
          {copy.upgrade(company.level + 1, company.next_level_gold)}
        </Button>
      ) : null}
      {quality && company.next_quality_gold !== null ? (
        <Button
          variant="secondary"
          onClick={() =>
            void run(
              supabase.rpc('upgrade_company_quality', {
                p_company_id: company.id,
                p_key: qualityKey,
              }),
            ).then((ok) => {
              if (ok) renewQualityKey();
            })
          }
        >
          {copy.quality(Number(quality[1]) + 1, company.next_quality_gold)}
        </Button>
      ) : null}
    </div>
  );
}

function Cash({ company, run }: { company: Company; run: Run }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const [amountText, setAmountText] = useState('');
  const [checked, setChecked] = useState(false);
  const [key, renewKey] = useActionKey();
  const amount = parseAmount(amountText);
  const move = (rpc: 'fund_company' | 'withdraw_from_company') => {
    setChecked(true);
    if (amount === null) return;
    void run(supabase.rpc(rpc, { p_company_id: company.id, p_amount: amount, p_key: key })).then(
      (ok) => {
        if (ok) {
          setAmountText('');
          setChecked(false);
          renewKey();
        }
      },
    );
  };
  return (
    <section className={styles.form} aria-label={copy.cash}>
      <h3 className="at-title-3">{copy.cash}</h3>
      <p className="at-figure">{formatMoney(company.cash, locale)}</p>
      {company.wage > 0 ? (
        <p className={styles.muted}>{copy.days(Math.floor(company.cash / company.wage))}</p>
      ) : null}
      <p className={styles.muted}>{copy.cashHint}</p>
      <Field
        label={copy.amount}
        value={amountText}
        inputMode="decimal"
        autoComplete="off"
        error={checked && amount === null ? copy.amountInvalid : undefined}
        onChange={(event) => {
          setAmountText(event.target.value);
          renewKey();
        }}
      />
      <div className={styles.actions}>
        <Button
          onClick={() => {
            move('fund_company');
          }}
        >
          {copy.deposit}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            move('withdraw_from_company');
          }}
        >
          {copy.withdraw}
        </Button>
      </div>
    </section>
  );
}

function Offer({ company, run }: { company: Company; run: Run }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const [wageText, setWageText] = useState(
    company.wage > 0 ? amountInput(company.wage, locale) : '',
  );
  const [vacancies, setVacancies] = useState(String(company.vacancies));
  const [checked, setChecked] = useState(false);
  const wage = parseAmount(wageText);
  const count = /^\d{1,3}$/.test(vacancies.trim()) ? Number(vacancies.trim()) : null;
  return (
    <form
      className={styles.form}
      noValidate
      aria-label={copy.offerTitle}
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (wage === null || count === null) return;
        void run(
          supabase.rpc('set_company_offer', {
            p_company_id: company.id,
            p_wage: wage,
            p_vacancies: count,
          }),
          copy.published,
        );
      }}
    >
      <h3 className="at-title-3">{copy.offerTitle}</h3>
      <Field
        label={copy.wage}
        value={wageText}
        inputMode="decimal"
        autoComplete="off"
        error={checked && wage === null ? copy.amountInvalid : undefined}
        onChange={(event) => {
          setWageText(event.target.value);
        }}
      />
      <Field
        label={copy.vacancies}
        value={vacancies}
        inputMode="numeric"
        autoComplete="off"
        error={checked && count === null ? copy.error_amount_invalid : undefined}
        onChange={(event) => {
          setVacancies(event.target.value);
        }}
      />
      <div>
        <Button type="submit">{copy.publish}</Button>
      </div>
    </form>
  );
}

function Employees({ companyId }: { companyId: number }) {
  const copy = useMessages(messages);
  const employees = useCompanyEmployees(companyId);
  const titleId = useId();
  const rows = employees.data ?? [];
  return (
    <section className={styles.form} aria-labelledby={titleId}>
      <h3 id={titleId} className="at-title-3">
        {copy.employees}
      </h3>
      {employees.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noEmployees}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-labelledby={titleId}>
            <thead>
              <tr>
                <th scope="col">{copy.name}</th>
                <th scope="col">{copy.today}</th>
                <th scope="col" className={styles.number}>
                  {copy.streak}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => (
                <tr key={employee.name}>
                  <td>{employee.name}</td>
                  <td>{employee.worked_today ? copy.worked : copy.notYet}</td>
                  <td className={styles.number}>{employee.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function Stock({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const stock = useCompanyStock(company.id);
  const titleId = useId();
  const rows = stock.data ?? [];
  return (
    <section className={styles.form} aria-labelledby={titleId}>
      <h3 id={titleId} className="at-title-3">
        {copy.stock}
      </h3>
      {stock.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.emptyStock}</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className={styles.recipes}>
          {rows.map((line) => (
            <li key={line.good_code}>
              <span>{goodName(line.good_code)}</span>
              <strong>{formatNumber(line.quantity, locale)}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      {company.points > 0 ? (
        <p className={styles.muted}>{copy.pending(formatNumber(company.points, locale))}</p>
      ) : null}
    </section>
  );
}
