import type { Movement } from '../../features/ledger/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** How the statement words a movement: its kind, its counterparty and the unit of its amounts. */
export function useMovementText() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const kinds: Partial<Record<string, string>> = {
    welcome_grant: copy.kind_welcome_grant,
    transfer: copy.kind_transfer,
    hold: copy.kind_hold,
    hold_release: copy.kind_hold_release,
    level_reward: copy.kind_level_reward,
  };

  return {
    kind: (kind: string) => kinds[kind] ?? copy.kind_other,

    counterparty: (movement: Movement): string => {
      switch (movement.counterparty_kind) {
        case 'citizen':
        case 'company':
          return movement.counterparty_name ?? '';
        case 'escrow':
          return copy.escrow;
        case 'treasury':
          return copy.treasury(
            countryName(movement.counterparty_country_code ?? movement.currency_code),
          );
        case 'sink':
          return copy.sink;
        case 'issuer':
          return movement.currency_code === 'GOLD'
            ? copy.gameIssuer
            : copy.countryIssuer(countryName(movement.currency_code));
      }
    },

    /** The player's own Credit goes bare, as on the canvas; Gold and other Credits name their unit. */
    unit: (currency: string) =>
      currency === citizen.country_code
        ? ''
        : currency === 'GOLD'
          ? ` ${copy.goldUnit}`
          : ` ${currency}`,
  };
}
