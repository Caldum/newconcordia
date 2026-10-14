import { Note } from '@concordia/atlas/Note';
import { useParams } from '@tanstack/react-router';

import styles from '../../features/economy/economy.module.css';
import { MilitaryTabs } from '../../features/military/MilitaryTabs';
import { useMyOffice } from '../../features/politics/queries';
import { useBattle } from '../../features/war/queries';
import { useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { BattleScore } from './BattleScore';
import { FightPanel } from './FightPanel';
import { messages } from './messages';
import { RankingPanel } from './RankingPanel';
import { RoundsPanel } from './RoundsPanel';
import { WeaponPanel } from './WeaponPanel';

/** `/battles/$battleId`: the live score, fighting, the weapon, the rounds and the ranking. */
export function BattlePage() {
  const copy = useMessages(messages);
  const regionName = useRegionName();
  const { battleId } = useParams({ from: '/game/battles/$battleId' });
  const id = Number(battleId);
  const battle = useBattle(id);
  const office = useMyOffice().data?.office ?? null;
  const data = battle.data ?? null;
  useDocumentTitle(data ? copy.battleTitle(regionName(data.region_code)) : copy.documentTitle);

  return (
    <main className={styles.page}>
      <MilitaryTabs />
      {battle.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {data ? (
        <>
          <div className={styles.intro}>
            <h1 className="at-title-1">{copy.battleTitle(regionName(data.region_code))}</h1>
          </div>
          <div className={styles.layout}>
            <div className={styles.column}>
              <BattleScore battle={data} />
              {data.status === 'active' ? (
                <FightPanel battle={data} isDefenseMinister={office === 'minister_defense'} />
              ) : null}
              {data.status === 'active' ? <WeaponPanel /> : null}
            </div>
            <div className={styles.column}>
              <RoundsPanel battleId={id} />
              <RankingPanel battleId={id} />
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
