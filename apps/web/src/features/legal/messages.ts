import { defineMessages } from '../../i18n';

export const legalMessages = defineMessages({
  es: {
    gateTitle: 'Antes de seguir',
    gateIntro:
      'Para jugar necesitas aceptar los términos y condiciones y la política de privacidad vigentes.',
    gateChanged:
      'Actualizamos estos documentos. Léelos y acepta la versión nueva para seguir jugando.',
    terms: (version: number) => `Términos y condiciones (versión ${String(version)})`,
    privacy: (version: number) => `Política de privacidad (versión ${String(version)})`,
    agree: 'Leí y acepto los términos y la política de privacidad.',
    accept: 'Aceptar y seguir',
    mustAgree: 'Marca la casilla para aceptar.',
    error_legal_version_invalid: 'Los documentos cambiaron mientras leías. Recarga la página.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    gateTitle: 'Before you go on',
    gateIntro:
      'To play you need to accept the terms and conditions and the privacy policy in force.',
    gateChanged:
      'We updated these documents. Read them and accept the new version to keep playing.',
    terms: (version: number) => `Terms and conditions (version ${String(version)})`,
    privacy: (version: number) => `Privacy policy (version ${String(version)})`,
    agree: 'I read and accept the terms and the privacy policy.',
    accept: 'Accept and go on',
    mustAgree: 'Tick the box to accept.',
    error_legal_version_invalid: 'The documents changed while you were reading. Reload the page.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});
