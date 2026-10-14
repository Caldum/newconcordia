import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Viajar · Concordia',
    title: 'Viajar',
    intro:
      'Llegas en el momento. Cada kilómetro cuesta 0,0001 oro y lo pagas en tu moneda nacional. El dinero del viaje sale del juego.',
    loadFailed: 'No se pudieron cargar los viajes. Recarga la página para intentar de nuevo.',
    hereTitle: 'Dónde estás',
    here: (region: string, country: string) => `${region}, ${country}`,
    rateMarket: (rate: string, currency: string) =>
      `Hoy 1 oro vale ${rate} ${currency}: el promedio del mercado de las últimas 6 horas.`,
    rateFallback: (rate: string, currency: string) =>
      `Sin operaciones recientes en el mercado, 1 oro se toma como ${rate} ${currency}.`,
    tripTitle: 'Tu viaje',
    destination: 'Destino',
    distance: 'Distancia',
    km: (km: string) => `${km} km`,
    price: 'Costo',
    travel: 'Viajar',
    traveled: (region: string) => `Llegaste a ${region}.`,
    closed: 'Los viajes están cerrados por ahora.',
    zeroHealth: 'Con la salud en 0 no puedes viajar. Cúrate primero.',
    error_travel_disabled: 'Los viajes están cerrados por ahora.',
    error_region_invalid: 'Elige otra región.',
    error_health_zero: 'Con la salud en 0 no puedes viajar. Cúrate primero.',
    error_insufficient_funds: 'No te alcanza el dinero para ese viaje.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    documentTitle: 'Travel · Concordia',
    title: 'Travel',
    intro:
      'You arrive at once. Each kilometre costs 0.0001 gold, paid in your national currency. The fare leaves the game.',
    loadFailed: 'Travel did not load. Reload the page to try again.',
    hereTitle: 'Where you are',
    here: (region: string, country: string) => `${region}, ${country}`,
    rateMarket: (rate: string, currency: string) =>
      `Today 1 gold is worth ${rate} ${currency}: the market average of the last 6 hours.`,
    rateFallback: (rate: string, currency: string) =>
      `With no recent market trades, 1 gold counts as ${rate} ${currency}.`,
    tripTitle: 'Your trip',
    destination: 'Destination',
    distance: 'Distance',
    km: (km: string) => `${km} km`,
    price: 'Cost',
    travel: 'Travel',
    traveled: (region: string) => `You arrived in ${region}.`,
    closed: 'Travel is closed for now.',
    zeroHealth: 'At 0 health you cannot travel. Heal first.',
    error_travel_disabled: 'Travel is closed for now.',
    error_region_invalid: 'Choose another region.',
    error_health_zero: 'At 0 health you cannot travel. Heal first.',
    error_insufficient_funds: 'You do not have enough money for that trip.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});
