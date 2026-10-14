import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import type { Battle } from '../../features/war/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatDateTime, formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** Rounds won by each side and, while it lasts, the damage of the round under way. */
export function BattleScore({ battle }: { battle: Battle }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const active = battle.status === 'active';
  const winner =
    battle.winner === 'attacker'
      ? countryName(battle.attacker_country_code)
      : countryName(battle.defender_country_code);

  return (
    <Panel className={styles.panel} aria-labelledby="score-title">
      <h2 id="score-title" className="at-title-3">
        {active
          ? copy.roundLive(battle.current_round, formatDateTime(battle.round_ends_at, locale))
          : copy.finished(winner)}
      </h2>
      <dl className={styles.facts}>
        <div>
          <dt>{copy.attacker}</dt>
          <dd>
            {copy.sideLine(countryName(battle.attacker_country_code), battle.attacker_rounds)}
            {active ? (
              <>
                <br />
                {copy.damage(formatNumber(battle.attacker_damage, locale))}
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>{copy.defender}</dt>
          <dd>
            {copy.sideLine(countryName(battle.defender_country_code), battle.defender_rounds)}
            {active ? (
              <>
                <br />
                {copy.damage(formatNumber(battle.defender_damage, locale))}
              </>
            ) : null}
          </dd>
        </div>
      </dl>
      {battle.my_side_order ? <p className={styles.muted}>{copy.priority}</p> : null}
    </Panel>
  );
}
