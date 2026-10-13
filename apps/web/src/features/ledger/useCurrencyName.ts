import { defineMessages, useMessages } from '../../i18n';
import { useCountryName } from '../world/useNames';

const messages = defineMessages({
  es: { gold: 'Oro', credit: (country: string) => `Crédito de ${country}` },
  en: { gold: 'Gold', credit: (country: string) => `Credit of ${country}` },
});

/** «Oro», «Crédito de Argentina»: a currency code in the player's language. */
export function useCurrencyName(): (code: string) => string {
  const copy = useMessages(messages);
  const country = useCountryName();
  return (code) => (code === 'GOLD' ? copy.gold : copy.credit(country(code)));
}
