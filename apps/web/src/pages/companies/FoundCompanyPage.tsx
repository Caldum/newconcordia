import { Button, buttonClassName } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';

import type { Citizen } from '../../features/auth/useCitizen';
import styles from '../../features/economy/economy.module.css';
import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { isRaw, useGoodName } from '../../features/economy/goods';
import { act, errorCode, problemText } from '../../features/economy/queries';
import { useActionKey } from '../../features/economy/useActionKey';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { formatNumber, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { foundMessages as messages } from './messages';

/** What a company can make when founded; weapons start at Q1. */
const goods = ['wheat', 'iron', 'oil', 'ration', 'weapon_q1', 'fuel'] as const;
type Good = (typeof goods)[number];

/** `/companies/new` (FoundCompany canvas). */
export function FoundCompanyPage() {
  return (
    <CitizenOnly>
      {(citizen) => (
        <GameShell>
          <FoundCompany citizen={citizen} />
        </GameShell>
      )}
    </CitizenOnly>
  );
}

function FoundCompany({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const world = useWorld();
  const queryClient = useQueryClient();
  const regionId = useId();
  const [key, renewKey] = useActionKey();
  const regions = [...(world.data?.regions.values() ?? [])].filter(
    (region) => region.owner_country_code === citizen.country_code && region.is_enabled,
  );
  const [good, setGood] = useState<Good>('wheat');
  const [regionCode, setRegionCode] = useState(citizen.region_code);
  const [name, setName] = useState('');
  const [checked, setChecked] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [founded, setFounded] = useState<{ name: string; region: string } | null>(null);
  const [pending, setPending] = useState(false);

  const validName = name.trim().length >= 3 && name.trim().length <= 40;
  const regionName = world.data?.regions.get(regionCode)?.name ?? regionCode;
  const yields = isRaw(good)
    ? copy.rawYield(formatNumber(10 * 0.5, locale), goodName(good).toLowerCase())
    : good === 'ration'
      ? copy.rations
      : good === 'fuel'
        ? copy.fuel
        : copy.weapons;

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    if (!validName) return;
    setPending(true);
    setProblem(null);
    try {
      await act(
        supabase.rpc('found_company', {
          p_name: name.trim(),
          p_good_code: good,
          p_region_code: regionCode,
          p_key: key,
        }),
      );
      setFounded({ name: name.trim(), region: regionName });
      setName('');
      setChecked(false);
      renewKey();
    } catch (error) {
      setProblem(errorCode(error));
    } finally {
      setPending(false);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  };

  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      <div role="status">
        {founded ? (
          <Panel className={styles.panel}>
            <Note tone="ok">{copy.founded(founded.name, founded.region)}</Note>
            <div>
              <Link to="/companies" className={buttonClassName({})}>
                {copy.manage}
              </Link>
            </div>
          </Panel>
        ) : null}
      </div>
      <form className={styles.layout} noValidate onSubmit={(event) => void submit(event)}>
        <div className={styles.column}>
          <Panel className={styles.panel}>
            <fieldset className={styles.form}>
              <legend className="at-title-3">{copy.what}</legend>
              {goods.map((code) => (
                <label key={code} className={styles.actions}>
                  <input
                    type="radio"
                    name="good"
                    value={code}
                    checked={good === code}
                    onChange={() => {
                      setGood(code);
                      renewKey();
                    }}
                  />
                  <span>{goodName(code)}</span>
                  <span className={styles.muted}>{isRaw(code) ? copy.raw : copy.product}</span>
                </label>
              ))}
            </fieldset>
          </Panel>
          <Panel className={styles.panel}>
            <h2 className="at-title-3">{copy.where}</h2>
            <p className={styles.muted}>{isRaw(good) ? copy.whereRaw : copy.whereProduct}</p>
            <div className={styles.field}>
              <label htmlFor={regionId} className={styles.label}>
                {copy.region}
              </label>
              <select
                id={regionId}
                className={styles.select}
                value={regionCode}
                onChange={(event) => {
                  setRegionCode(event.target.value);
                  renewKey();
                }}
              >
                {regions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
          </Panel>
          <Panel className={styles.panel}>
            <h2 className="at-title-3">{copy.nameStep}</h2>
            <Field
              label={copy.name}
              hint={copy.nameHint}
              value={name}
              maxLength={40}
              autoComplete="off"
              error={checked && !validName ? copy.nameMissing : undefined}
              onChange={(event) => {
                setName(event.target.value);
                renewKey();
              }}
            />
          </Panel>
        </div>
        <Panel className={styles.panel} aria-labelledby="found-summary">
          <h2 id="found-summary" className="at-title-3">
            {copy.summary}
          </h2>
          <dl className={styles.lines}>
            <div>
              <dt>{copy.what.replace(/^1\. /, '')}</dt>
              <dd>{goodName(good)}</dd>
            </div>
            <div>
              <dt>{copy.where.replace(/^2\. /, '')}</dt>
              <dd>{regionName}</dd>
            </div>
            <div>
              <dt>{copy.yields}</dt>
              <dd>{yields}</dd>
            </div>
            <div>
              <dt>{copy.cost}</dt>
              <dd>{copy.costValue}</dd>
            </div>
          </dl>
          {problem ? <Note tone="error">{problemText(copy, problem)}</Note> : null}
          <div>
            <Button type="submit" size="large" disabled={pending}>
              {pending ? copy.founding : copy.submit}
            </Button>
          </div>
        </Panel>
      </form>
    </main>
  );
}
