import { defineMessages } from '../../i18n';

export const paramMessages = defineMessages({
  es: {
    title: 'Parámetros',
    intro:
      'Cada número del balance del juego: energía, recompensas, límites, tiempos. Un cambio vale al instante para todas las reglas y queda en el registro con su motivo. Los precios en oro tienen su propia sección.',
    filter: 'Buscar parámetro',
    count: (shown: number, total: number) => `${String(shown)} de ${String(total)}`,
    value: 'Valor',
    reason: 'Motivo',
    save: 'Guardar',
    saved: 'Parámetro guardado.',
    managed: 'Se cambia con su propio interruptor (Acceso).',
    updated: (when: string) => `Cambió por última vez ${when}`,
    invalidValue: 'Escribe un número de 0 o más, con hasta seis decimales.',
    none: 'Ningún parámetro coincide.',
    loadFailed: 'No se pudieron cargar los parámetros.',
    error_value_invalid: 'Ese valor no sirve: va de 0 a 1.000.000.000.',
    error_param_managed: 'Ese parámetro se cambia desde su propio interruptor.',
    error_param_invalid: 'Ese parámetro ya no existe.',
  },
  en: {
    title: 'Parameters',
    intro:
      'Every number of the game’s balance: energy, rewards, limits, times. A change applies at once to every rule and goes into the log with its reason. GOLD prices have their own section.',
    filter: 'Search parameter',
    count: (shown: number, total: number) => `${String(shown)} of ${String(total)}`,
    value: 'Value',
    reason: 'Reason',
    save: 'Save',
    saved: 'Parameter saved.',
    managed: 'Changed with its own switch (Access).',
    updated: (when: string) => `Last changed ${when}`,
    invalidValue: 'Write a number of 0 or more, with up to six decimals.',
    none: 'No parameter matches.',
    loadFailed: 'The parameters did not load.',
    error_value_invalid: 'That value does not work: it goes from 0 to 1,000,000,000.',
    error_param_managed: 'That parameter is changed from its own switch.',
    error_param_invalid: 'That parameter no longer exists.',
  },
});
