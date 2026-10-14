import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { useMarketLicenseTerms, useMyMarketLicenses } from '../../features/market/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { BuyLicenseForm } from './BuyLicenseForm';
import { licensesMessages } from './licensesMessages';
import { MarketTabs } from './MarketTabs';
import { MyLicenses } from './MyLicenses';

/** `/market/licenses`: what a foreign market license costs, the ones held and buying another. */
export function LicensesPage() {
  const copy = useMessages(licensesMessages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const terms = useMarketLicenseTerms();
  const licenses = useMyMarketLicenses();
  const held = (licenses.data ?? []).map((license) => license.market_country_code);
  const price = terms.data ? formatMoney(terms.data.price, locale, { whole: true }) : null;

  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro(countryName(citizen.country_code))}</p>
        {terms.data && price ? (
          <p>
            {copy.terms(
              price,
              formatMoney(terms.data.country_share, locale, { whole: true }),
              formatMoney(terms.data.price - terms.data.country_share, locale, { whole: true }),
            )}
          </p>
        ) : null}
      </div>
      {terms.isError || licenses.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {licenses.isSuccess ? (
        <div className={styles.layout}>
          <MyLicenses licenses={licenses.data} />
          {price ? <BuyLicenseForm held={held} price={price} /> : null}
        </div>
      ) : null}
    </main>
  );
}
