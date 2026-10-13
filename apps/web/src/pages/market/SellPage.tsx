import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { MarketTabs } from './MarketTabs';
import { messages } from './messages';
import { MyOffers } from './MyOffers';
import { SellForm } from './SellForm';
import { useSellSources } from './useSellSources';

/** `/market/sell` (Sell canvas): post an offer and manage the open ones. */
export function SellPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.sellDocumentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const sources = useSellSources();
  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.sellTitle}</h1>
        <p className="at-body-l">{copy.sellIntro(countryName(citizen.country_code))}</p>
      </div>
      <div className={styles.layout}>
        {sources.length > 0 ? (
          <SellForm sources={sources} />
        ) : (
          <Panel className={styles.panel}>
            <p>{copy.nothingToSell}</p>
          </Panel>
        )}
        <MyOffers />
      </div>
    </main>
  );
}
