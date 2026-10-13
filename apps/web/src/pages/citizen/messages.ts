import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Crea tu ciudadano · Concordia',
    storyTitle: 'Te falta un paso.',
    storyBody: 'Elige el nombre de tu ciudadano y el país donde empiezas.',
    title: 'Crea tu ciudadano',
    intro: (email: string) => `Entraste como ${email}.`,
    submit: 'Crear mi ciudadano',
    sending: 'Creando tu ciudadano…',
    countryNotInPlay: 'Ese país no está en juego. Elige otro de la lista.',
    failed: 'No pudimos crear tu ciudadano. Vuelve a intentar en unos minutos.',
  },
  en: {
    documentTitle: 'Create your citizen · Concordia',
    storyTitle: 'One step left.',
    storyBody: 'Choose your citizen’s name and the country where you start.',
    title: 'Create your citizen',
    intro: (email: string) => `You signed in as ${email}.`,
    submit: 'Create my citizen',
    sending: 'Creating your citizen…',
    countryNotInPlay: 'That country is not in play. Choose another one from the list.',
    failed: 'We could not create your citizen. Try again in a few minutes.',
  },
});
