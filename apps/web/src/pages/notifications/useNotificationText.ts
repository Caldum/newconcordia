import type { GameNotification } from '../../features/notifications/queries';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The sentence for a notification, from its kind and payload, in the player's language. */
export function useNotificationText(): (notification: GameNotification) => string {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const regionName = useRegionName();
  return ({ kind, payload }) => {
    const text = (key: string) => (typeof payload[key] === 'string' ? payload[key] : '');
    const number = (key: string) => (typeof payload[key] === 'number' ? payload[key] : 0);
    switch (kind) {
      case 'injury':
        return copy.injury(number('health_lost'), number('health_after'));
      case 'office_taken':
        return copy.office_taken;
      case 'friend_requested':
      case 'friend_accepted':
        return copy[kind](text('name'));
      case 'citizenship_approved':
      case 'citizenship_rejected':
        return copy[kind](countryName(text('country_code')));
      case 'battle_started':
        return copy.battle_started(
          countryName(text('attacker')),
          countryName(text('defender')),
          regionName(text('region_code')),
        );
      case 'battle_finished':
        return copy.battle_finished(
          countryName(text(text('winner') === 'attacker' ? 'attacker' : 'defender')),
          regionName(text('region_code')),
        );
      case 'bill_presented':
        return copy.bill_presented(text('title'));
      case 'bill_closed': {
        const status = text('status');
        const label =
          status === 'executed'
            ? copy.bill_executed
            : status === 'not_executed'
              ? copy.bill_not_executed
              : copy.bill_rejected;
        return copy.bill_closed(text('title'), label);
      }
      case 'motion_opened':
        return copy.motion_opened(text('target'));
      case 'war_authorized':
        return copy.war_authorized(countryName(text('target')));
      case 'election_voting':
        return copy.election_voting(
          text('kind') === 'president' ? copy.election_president : copy.election_congress,
        );
      default:
        return copy.other;
    }
  };
}
