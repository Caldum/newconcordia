import { Panel } from '@concordia/atlas/Panel';
import { Scoreboard } from '@concordia/atlas/Scoreboard';
import { ProgressMeter } from '@concordia/atlas/Track';

import { countdown, formatCountdown, liberationShare, wholePercent } from '../../features/war/live';
import type { IndependenceWar } from '../../features/war/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatNumber, useLocale, useMessages } from '../../i18n';
import { useTick } from '../../lib/useTick';

import { CountrySilhouette } from './CountrySilhouette';
import styles from './IndependenceWar.module.css';
import { messages } from './messages';

interface LiberationBoardProps {
  war: IndependenceWar;
  country: string;
}

/** The war's scoreboard: how much of the target the country reached, the map filling up and the time left. */
export function LiberationBoard({ war, country }: LiberationBoardProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const now = useTick();
  const share = liberationShare(war.damage_total, war.damage_target);
  const percent = wholePercent(share);
  const left = formatCountdown(countdown(war.ends_at, now));
  const name = countryName(country);
  const progress = copy.progress(
    formatNumber(war.damage_total, locale),
    formatNumber(war.damage_target, locale),
  );

  return (
    <Panel className={styles.board} aria-labelledby="board-title">
      <h2 id="board-title" className="at-visually-hidden">
        {copy.boardSummary(name, percent, left)}
      </h2>
      <Scoreboard
        summary={copy.boardSummary(name, percent, left)}
        left={{ country: name, percent, role: copy.ownRole, tone: 'own' }}
        right={{
          country: copy.occupier,
          percent: 100 - percent,
          role: copy.occupierRole,
          tone: 'rival',
        }}
        region={<CountrySilhouette country={country} label={copy.silhouette(name)} share={share} />}
      />
      <ProgressMeter
        value={war.damage_total}
        max={war.damage_target}
        label={progress}
        valueText={progress}
      />
      <p className={styles.boardLine}>
        <span>{progress}</span>
        {war.status === 'active' ? <span>{copy.endsIn(left)}</span> : null}
      </p>
      {war.status === 'won' ? (
        <p className={styles.outcome} role="status">
          {copy.won(war.hero_name)}
        </p>
      ) : war.status === 'expired' ? (
        <p className={styles.outcome} role="status">
          {copy.expired}
        </p>
      ) : war.status === 'closing' ? (
        <p className={styles.outcome} role="status">
          {copy.closing}
        </p>
      ) : null}
    </Panel>
  );
}
