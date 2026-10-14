import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Inicio · Concordia',
    citizenOf: (country: string) => `Ciudadanía: ${country}`,
    body: 'Trabaja, entrena, vota, comercia y pelea por tu país. Cada día hay cuatro misiones que pagan Oro.',
    openMap: 'Ver el mapa',
    citizenship: 'Ver mi ciudadanía',
    loadFailed: 'No se pudo cargar tu ciudadano. Recarga la página para intentar de nuevo.',
  },
  en: {
    documentTitle: 'Home · Concordia',
    citizenOf: (country: string) => `Citizenship: ${country}`,
    body: 'Work, train, vote, trade and fight for your country. Every day four missions pay Gold.',
    openMap: 'See the map',
    citizenship: 'See my citizenship',
    loadFailed: 'Your citizen did not load. Reload the page to try again.',
  },
});
