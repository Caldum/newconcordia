import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import styles from '../../features/economy/economy.module.css';
import { useBattles } from '../../features/war/queries';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Ongoing battles first, then the ones that ended in the last three days. */
export function BattleList() {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const regionName = useRegionName();
  const battles = useBattles();
  const rows = battles.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="battles-title">
      <h2 id="battles-title" className="at-title-3">
        {copy.activeTitle}
      </h2>
      {battles.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {battles.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noBattles}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((battle) => {
          const line = (battle.kind === 'war' ? copy.battleLine : copy.resistanceLine)(
            regionName(battle.region_code),
            countryName(battle.attacker_country_code),
            countryName(battle.defender_country_code),
          );
          const winner =
            battle.winner === 'attacker'
              ? countryName(battle.attacker_country_code)
              : countryName(battle.defender_country_code);
          return (
            <li key={battle.battle_id}>
              <span>
                <strong>{line}</strong>
                <br />
                <span className={styles.muted}>
                  {copy.score(battle.attacker_rounds, battle.defender_rounds)} ·{' '}
                  {battle.status === 'active'
                    ? copy.roundOf(battle.current_round)
                    : copy.finished(winner)}
                </span>
              </span>
              <Link to="/battles/$battleId" params={{ battleId: String(battle.battle_id) }}>
                {copy.follow}
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
