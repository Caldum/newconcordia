import { tradableMarkets } from '../../features/market/markets';
import { useMyMarketLicenses } from '../../features/market/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';

/** The markets the player can trade in: their country's, then each one they hold a license for. */
export function useTradableMarkets(): string[] {
  const citizen = useCurrentCitizen();
  const licenses = useMyMarketLicenses();
  return tradableMarkets(
    citizen.country_code,
    (licenses.data ?? []).map((license) => license.market_country_code),
  );
}
