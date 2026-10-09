import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Inicio · Concordia',
    homeLabel: 'Concordia, ir al inicio',
    nav: 'Principal',
    map: 'Mapa',
    signOut: 'Cerrar sesión',
    citizenOf: (country: string) => `Ciudadanía: ${country}`,
    body: 'Tu cuenta está lista. Mientras se abren el trabajo, el entrenamiento y las batallas, puedes recorrer el mapa y ver quién controla cada región.',
    openMap: 'Ver el mapa',
    loadFailed: 'No se pudo cargar tu ciudadano. Recarga la página para intentar de nuevo.',
  },
  en: {
    documentTitle: 'Home · Concordia',
    homeLabel: 'Concordia, go to home',
    nav: 'Main',
    map: 'Map',
    signOut: 'Sign out',
    citizenOf: (country: string) => `Citizenship: ${country}`,
    body: 'Your account is ready. Until work, training and battles open, you can explore the map and see who controls each region.',
    openMap: 'See the map',
    loadFailed: 'Your citizen did not load. Reload the page to try again.',
  },
});
