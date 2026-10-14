import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useBattleRounds } from '../../features/war/queries';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The closed rounds: damage of each side and who took the round. */
export function RoundsPanel({ battleId }: { battleId: number }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const rounds = useBattleRounds(battleId);
  const rows = rounds.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="rounds-title">
      <h2 id="rounds-title" className="at-title-3">
        {copy.roundsTitle}
      </h2>
      {rounds.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noRounds}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((round) => (
          <li key={round.round_no}>
            {copy.roundLine(
              round.round_no,
              formatNumber(round.attacker_damage, locale),
              formatNumber(round.defender_damage, locale),
              round.winner === 'attacker' ? copy.attacker : copy.defender,
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
