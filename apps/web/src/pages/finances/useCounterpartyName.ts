import { ministryOfLabel } from '../../features/finance/movements';
import type { PublicMovement } from '../../features/finance/queries';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Who is on the other side of a public movement, in the player's language. */
export function useCounterpartyName(): (movement: PublicMovement) => string {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  return ({ counterparty_kind: kind, counterparty_name: name }) => {
    switch (kind) {
      case 'issuer':
        return copy.issuer;
      case 'sink':
        return copy.sink;
      case 'escrow':
        return copy.escrow;
      case 'treasury':
        return `${copy.institution_treasury} · ${countryName(name ?? '')}`;
      case 'central_bank':
        return `${copy.institution_central_bank} · ${countryName(name ?? '')}`;
      case 'ministry': {
        const ministry = ministryOfLabel(name);
        return ministry && `institution_${ministry}` in copy
          ? copy[`institution_${ministry}` as 'institution_health']
          : copy.system;
      }
      default:
        return name ?? copy.system;
    }
  };
}
