import { Note } from '@concordia/atlas/Note';
import { Status } from '@concordia/atlas/Status';
import { Link } from '@tanstack/react-router';

import styles from '../../features/economy/economy.module.css';
import { MilitaryTabs } from '../../features/military/MilitaryTabs';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useIndependenceWar } from '../../features/war/queries';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { WeaponPanel } from '../battles/WeaponPanel';

import { Battlefield } from './Battlefield';
import { HeroesPanel } from './HeroesPanel';
import own from './IndependenceWar.module.css';
import { LiberationBoard } from './LiberationBoard';
import { messages } from './messages';
import { MySharePanel } from './MySharePanel';
import { PulsePanel } from './PulsePanel';
import { StrikeFeed } from './StrikeFeed';
import { StrikePanel } from './StrikePanel';

/**
 * `/battles/independence`: the country's independence war, live. Everything refreshes every two seconds, so the
 * strikes of every citizen show up as they land.
 */
export function IndependenceWarPage() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const war = useIndependenceWar(citizen.country_code, { live: true });
  const data = war.data ?? null;
  useDocumentTitle(copy.documentTitle);

  return (
    <main className={styles.page}>
      <MilitaryTabs />
      <div className={own.head}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        {data?.status === 'active' ? <Status tone="live">{copy.live}</Status> : null}
      </div>
      {war.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {war.isSuccess && !data ? (
        <Note tone="info">
          {copy.noWar} <Link to="/battles">{copy.backToBattles}</Link>
        </Note>
      ) : null}
      {data ? (
        <>
          <LiberationBoard war={data} country={citizen.country_code} />
          <Battlefield
            warId={data.war_id}
            myName={citizen.name}
            country={citizen.country_code}
            status={data.status}
          />
          <div className={styles.layout}>
            <div className={styles.column}>
              {data.status === 'active' ? (
                <>
                  <StrikePanel warId={data.war_id} country={citizen.country_code} />
                  <WeaponPanel />
                </>
              ) : null}
              <StrikeFeed warId={data.war_id} myName={citizen.name} />
            </div>
            <div className={styles.column}>
              <MySharePanel warId={data.war_id} />
              <PulsePanel warId={data.war_id} />
              <HeroesPanel warId={data.war_id} />
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
