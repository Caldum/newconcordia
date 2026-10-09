import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Inicio · Concordia',
    citizenOf: (country: string) => `Ciudadanía: ${country}`,
    body: 'Tu cuenta está lista. Mientras se abren el trabajo, el entrenamiento y las batallas, puedes recorrer el mapa y ver quién controla cada región.',
    openMap: 'Ver el mapa',
    citizenship: 'Ver mi ciudadanía',
    loadFailed: 'No se pudo cargar tu ciudadano. Recarga la página para intentar de nuevo.',
  },
  en: {
    documentTitle: 'Home · Concordia',
    citizenOf: (country: string) => `Citizenship: ${country}`,
    body: 'Your account is ready. Until work, training and battles open, you can explore the map and see who controls each region.',
    openMap: 'See the map',
    citizenship: 'See my citizenship',
    loadFailed: 'Your citizen did not load. Reload the page to try again.',
  },
});
