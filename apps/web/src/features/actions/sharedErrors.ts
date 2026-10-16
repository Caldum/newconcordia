import { defineMessages } from '../../i18n';

/** Refusals any action can get, whatever the screen. A screen's own catalog wins when it has the same code. */
export const sharedErrors = defineMessages({
  es: {
    error_rate_limited:
      'Hiciste muchas acciones en un minuto. Espera un momento y vuelve a intentar.',
    error_account_suspended: 'Tu cuenta está suspendida: por ahora no puedes jugar.',
    error_muted: 'Estás silenciado: por ahora no puedes publicar ni escribir mensajes.',
  },
  en: {
    error_rate_limited: 'You did many actions in a minute. Wait a moment and try again.',
    error_account_suspended: 'Your account is suspended: you cannot play for now.',
    error_muted: 'You are muted: you cannot publish or write messages for now.',
  },
});
