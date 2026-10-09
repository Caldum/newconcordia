import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Citizen } from '../../features/auth/useCitizen';
import styles from '../../features/economy/economy.module.css';
import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { useGoodName } from '../../features/economy/goods';
import {
  act,
  errorCode,
  problemText,
  useJobOffers,
  useMyCompanies,
  useMyJob,
  useMyWorkday,
} from '../../features/economy/queries';
import type { Job, Workday } from '../../features/economy/queries';
import { useActionKey } from '../../features/economy/useActionKey';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { formatMoney, formatNumber, formatPercent, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

/** `/work` (Work canvas). */
export function WorkPage() {
  return (
    <CitizenOnly>
      {(citizen) => (
        <GameShell>
          <Work citizen={citizen} />
        </GameShell>
      )}
    </CitizenOnly>
  );
}

function useNames() {
  const { locale } = useLocale();
  const world = useWorld();
  return {
    region: (code: string) => world.data?.regions.get(code)?.name ?? code,
    country: (code: string) => {
      const country = world.data?.countries.get(code);
      if (!country) return code;
      return locale === 'es' ? country.name_es : country.name_en;
    },
  };
}

function Work({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const job = useMyJob();
  const workday = useMyWorkday();
  const companies = useMyCompanies();
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {job.isError || workday.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {problem ? <Note tone="error">{problemText(copy, problem)}</Note> : null}
      {job.isSuccess && workday.isSuccess ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            {job.data ? (
              <JobCard job={job.data} onProblem={setProblem} />
            ) : (
              <Panel className={styles.panel}>
                <p>{copy.noJob}</p>
              </Panel>
            )}
            <Offers citizen={citizen} hasJob={job.data !== null} onProblem={setProblem} />
          </div>
          <div className={styles.column}>
            {job.data || workday.data ? (
              <Payslip job={job.data} workday={workday.data} onProblem={setProblem} />
            ) : null}
            {!workday.data && companies.data && companies.data.length > 0 ? (
              <OwnCompanies
                companies={companies.data.map(({ id, name }) => ({ id, name }))}
                onProblem={setProblem}
              />
            ) : null}
            <HowItWorks />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function JobCard({ job, onProblem }: { job: Job; onProblem: (code: string | null) => void }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const names = useNames();
  const goodName = useGoodName();
  const queryClient = useQueryClient();
  return (
    <Panel className={styles.panel} aria-labelledby="job-title">
      <div className={styles.panelHead}>
        <div>
          <p className={styles.muted}>{copy.yourJob}</p>
          <h2 id="job-title" className="at-title-2">
            {job.company_name}
          </h2>
          <p className={styles.muted}>
            {`${names.region(job.region_code)} · ${goodName(job.good_code)} · ${copy.owner(job.owner_name)}`}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            onProblem(null);
            void act(supabase.rpc('leave_job'))
              .catch((error: unknown) => {
                onProblem(errorCode(error));
              })
              .finally(() => void queryClient.invalidateQueries({ queryKey: ['me'] }));
          }}
        >
          {copy.leave}
        </Button>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>{copy.wage}</dt>
          <dd>{formatMoney(job.wage, locale)}</dd>
        </div>
        <div>
          <dt>{copy.streak}</dt>
          <dd>{job.streak}</dd>
        </div>
        <div>
          <dt>{copy.produces}</dt>
          <dd>{copy.points(10)}</dd>
        </div>
      </dl>
    </Panel>
  );
}

function Payslip({
  job,
  workday,
  onProblem,
}: {
  job: Job | null;
  workday: Workday | null;
  onProblem: (code: string | null) => void;
}) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const queryClient = useQueryClient();
  const [key, renewKey] = useActionKey();
  const [pending, setPending] = useState(false);
  const [energyLeft, setEnergyLeft] = useState<number | null>(null);

  const gross = workday?.gross ?? job?.wage ?? 0;
  const tax = workday?.tax ?? Math.round(gross * (job?.work_tax ?? 0));
  const rate = formatPercent(job?.work_tax ?? 0, locale);

  const work = async () => {
    onProblem(null);
    setPending(true);
    try {
      const rows = await act(supabase.rpc('work', { p_key: key }));
      setEnergyLeft(rows?.[0]?.energy ?? null);
      renewKey();
    } catch (error) {
      onProblem(errorCode(error));
    } finally {
      setPending(false);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  };

  return (
    <Panel className={styles.panel} aria-labelledby="payslip-title">
      <h2 id="payslip-title" className="at-title-3">
        {workday ? copy.doneToday : copy.today}
      </h2>
      <dl className={styles.lines}>
        <div>
          <dt>{copy.gross}</dt>
          <dd>{formatMoney(gross, locale)}</dd>
        </div>
        <div>
          <dt>{copy.tax(rate)}</dt>
          <dd>{formatMoney(-tax, locale)}</dd>
        </div>
        <div>
          <dt>{copy.energy}</dt>
          <dd>−10</dd>
        </div>
        <div>
          <dt>{copy.net}</dt>
          <dd>{formatMoney(gross - tax, locale)}</dd>
        </div>
      </dl>
      {workday ? (
        <div role="status">
          <Note tone="ok">{copy.paid(formatMoney(workday.net, locale))}</Note>
          <p className={styles.muted}>
            {copy.produced(formatNumber(workday.produced, locale), goodName(workday.good_code))}
          </p>
          <p className={styles.muted}>
            {energyLeft === null
              ? copy.comeBack
              : `${copy.energyLeft(energyLeft)} ${copy.comeBack}`}
          </p>
        </div>
      ) : (
        <div>
          <Button size="large" disabled={pending} onClick={() => void work()}>
            {pending ? copy.working : copy.work}
          </Button>
        </div>
      )}
    </Panel>
  );
}

function OwnCompanies({
  companies,
  onProblem,
}: {
  companies: { id: number; name: string }[];
  onProblem: (code: string | null) => void;
}) {
  const copy = useMessages(messages);
  const queryClient = useQueryClient();
  const [key, renewKey] = useActionKey();
  return (
    <Panel className={styles.panel} aria-labelledby="own-title">
      <h2 id="own-title" className="at-title-3">
        {copy.ownCompanies}
      </h2>
      <p className={styles.muted}>{copy.ownCompaniesHint}</p>
      <div className={styles.actions}>
        {companies.map((company) => (
          <Button
            key={company.id}
            variant="secondary"
            onClick={() => {
              onProblem(null);
              void act(supabase.rpc('work', { p_company_id: company.id, p_key: key }))
                .then(renewKey)
                .catch((error: unknown) => {
                  onProblem(errorCode(error));
                })
                .finally(() => void queryClient.invalidateQueries({ queryKey: ['me'] }));
            }}
          >
            {copy.workIn(company.name)}
          </Button>
        ))}
      </div>
    </Panel>
  );
}

function Offers({
  citizen,
  hasJob,
  onProblem,
}: {
  citizen: Citizen;
  hasJob: boolean;
  onProblem: (code: string | null) => void;
}) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const names = useNames();
  const goodName = useGoodName();
  const offers = useJobOffers();
  const queryClient = useQueryClient();
  const rows = offers.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="offers-title">
      <h2 id="offers-title" className="at-title-3">
        {copy.offers(names.country(citizen.country_code))}
      </h2>
      <p className={styles.muted}>{copy.offersHint}</p>
      {offers.isSuccess && rows.length === 0 ? <p>{copy.noOffers}</p> : null}
      {rows.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-labelledby="offers-title">
            <thead>
              <tr>
                <th scope="col">{copy.company}</th>
                <th scope="col">{copy.region}</th>
                <th scope="col">{copy.produces}</th>
                <th scope="col" className={styles.number}>
                  {copy.wage}
                </th>
                <th scope="col" className={styles.number}>
                  {copy.vacancies}
                </th>
                <th scope="col">{copy.action}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((offer) => (
                <tr key={offer.company_id}>
                  <td>{offer.name}</td>
                  <td>{names.region(offer.region_code)}</td>
                  <td>{goodName(offer.good_code)}</td>
                  <td className={styles.number}>{formatMoney(offer.wage, locale)}</td>
                  <td className={styles.number}>{offer.vacancies}</td>
                  <td>
                    <Button
                      variant={hasJob ? 'secondary' : 'primary'}
                      aria-label={copy.takeLabel(offer.name)}
                      onClick={() => {
                        onProblem(null);
                        void act(supabase.rpc('take_job', { p_company_id: offer.company_id }))
                          .catch((error: unknown) => {
                            onProblem(errorCode(error));
                          })
                          .finally(() => void queryClient.invalidateQueries({ queryKey: ['me'] }));
                      }}
                    >
                      {copy.take}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

function HowItWorks() {
  const copy = useMessages(messages);
  const goodName = useGoodName();
  return (
    <Panel className={styles.panel} aria-labelledby="how-title">
      <h2 id="how-title" className="at-title-3">
        {copy.howTitle}
      </h2>
      <p>{copy.howBody}</p>
      <ul className={styles.recipes}>
        <li>
          <span>{goodName('ration')}</span>
          <span>{copy.recipeRation}</span>
        </li>
        <li>
          <span>{copy.weaponsQ}</span>
          <span>{copy.recipeWeapon}</span>
        </li>
        <li>
          <span>{goodName('fuel')}</span>
          <span>{copy.recipeFuel}</span>
        </li>
      </ul>
    </Panel>
  );
}
