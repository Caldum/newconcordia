import { defineMessages } from '../../i18n';

export const independenceMessages = defineMessages({
  es: {
    title: 'Guerra de independencia (prueba)',
    hint: 'Modo de prueba mientras se definen sus reglas (PD-02). Necesita el interruptor independence_war_enabled encendido. Queda registrado.',
    country: 'País',
    target: 'Meta de daño',
    targetInvalid: 'Escribe una meta entera mayor que cero.',
    start: 'Abrir la guerra',
    started: 'La guerra de independencia está abierta durante 7 días.',
    error_not_admin: 'Solo la administración puede hacerlo.',
    error_feature_disabled: 'El modo de prueba está apagado.',
    error_country_invalid: 'Ese país no está en juego.',
    error_war_active: 'Ese país ya tiene una guerra de independencia abierta.',
    error_amount_invalid: 'La meta debe ser mayor que cero.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    title: 'Independence war (test)',
    hint: 'Test mode while its rules are defined (PD-02). It needs the independence_war_enabled switch on. It is logged.',
    country: 'Country',
    target: 'Damage target',
    targetInvalid: 'Write a whole target above zero.',
    start: 'Open the war',
    started: 'The independence war is open for 7 days.',
    error_not_admin: 'Only administrators can do this.',
    error_feature_disabled: 'The test mode is off.',
    error_country_invalid: 'That country is not in play.',
    error_war_active: 'That country already has an open independence war.',
    error_amount_invalid: 'The target must be above zero.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});
