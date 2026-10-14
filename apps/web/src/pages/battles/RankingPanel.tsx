import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useBattleRanking } from '../../features/war/queries';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The ten fighters with most damage on each side. */
export function RankingPanel({ battleId }: { battleId: number }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const ranking = useBattleRanking(battleId);
  const rows = ranking.data ?? [];
  const side = (which: 'attacker' | 'defender', title: string) => {
    const lines = rows.filter((line) => line.side === which);
    return lines.length === 0 ? null : (
      <>
        <h3 className="at-title-3">{title}</h3>
        <ol className={styles.recipes}>
          {lines.map((line) => (
            <li key={line.name}>
              {copy.rankingLine(line.name, formatNumber(line.damage, locale), line.attacks)}
            </li>
          ))}
        </ol>
      </>
    );
  };

  return (
    <Panel className={styles.panel} aria-labelledby="ranking-title">
      <h2 id="ranking-title" className="at-title-3">
        {copy.rankingTitle}
      </h2>
      {ranking.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noRanking}</p>
      ) : null}
      {side('attacker', copy.attacker)}
      {side('defender', copy.defender)}
    </Panel>
  );
}
