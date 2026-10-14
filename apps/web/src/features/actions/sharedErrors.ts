import { defineMessages } from '../../i18n';

/** Refusals any action can get, whatever the screen. A screen's own catalog wins when it has the same code. */
export const sharedErrors = defineMessages({
  es: {
    error_rate_limited:
      'Hiciste muchas acciones en un minuto. Espera un momento y vuelve a intentar.',
  },
  en: {
    error_rate_limited: 'You did many actions in a minute. Wait a moment and try again.',
  },
});
