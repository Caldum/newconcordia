import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Ciudadanía · Concordia',
    welcomeDocumentTitle: 'Bienvenida · Concordia',
    welcome: (country: string, name: string) => `Te damos la bienvenida a ${country}, ${name}.`,
    welcomeBody: (country: string, region: string) =>
      `Desde hoy tienes la ciudadanía de ${country} y vives en ${region}.`,
    enter: 'Entrar a mi país',
    title: 'Tu ciudadanía',
    documentHeading: 'Documento de ciudadanía',
    flagOf: (country: string) => `Bandera de ${country}`,
    name: 'Nombre',
    number: 'Número',
    region: 'Región',
    since: 'Ciudadanía desde',
    adaptationTitle: 'Tus primeros 7 días',
    adaptationDay: (day: number) => `Día ${String(day)} de 7`,
    adaptationIntro: (date: string) =>
      `Puedes hacer casi todo desde el primer día. Hasta el ${date} tienes dos límites:`,
    halfDamage: 'Tu daño en guerra cuenta a la mitad',
    halfDamageBody: 'Puedes combatir y ganar experiencia y rango con normalidad.',
    noVote: 'Todavía no votas en elecciones',
    noVoteBody: 'Las leyes las votan los congresistas. Puedes opinar en la prensa y escribirles.',
    votesFrom: (date: string) => `Votas en elecciones desde el ${date}.`,
    waitlistTitle: 'Lista de espera',
    waitlistBody: (country: string, place: number) =>
      `Esperas a ${country}: eres la persona ${String(place)} de la lista. Cuando abra, te escribimos y te mudas con todo lo que tengas.`,
    leaveWaitlist: 'Dejar de esperar',
    requestTitle: 'Cambio de país',
    requestPending: (country: string, date: string) =>
      `Pediste la ciudadanía de ${country}. Si nadie responde antes, se aprueba el ${date}.`,
    requestRejected: (country: string) => `${country} rechazó tu pedido de ciudadanía.`,
    cancelRequest: 'Cancelar el pedido',
    change: 'Cambiar de país',
    nextChange: (date: string) => `Puedes volver a cambiar de país desde el ${date}.`,
    reviewRequests: 'Ver pedidos de ciudadanía',
    actionFailed: 'No se pudo completar. Vuelve a intentar en unos minutos.',
  },
  en: {
    documentTitle: 'Citizenship · Concordia',
    welcomeDocumentTitle: 'Welcome · Concordia',
    welcome: (country: string, name: string) => `Welcome to ${country}, ${name}.`,
    welcomeBody: (country: string, region: string) =>
      `From today you are a citizen of ${country} and you live in ${region}.`,
    enter: 'Enter my country',
    title: 'Your citizenship',
    documentHeading: 'Citizenship document',
    flagOf: (country: string) => `Flag of ${country}`,
    name: 'Name',
    number: 'Number',
    region: 'Region',
    since: 'Citizen since',
    adaptationTitle: 'Your first 7 days',
    adaptationDay: (day: number) => `Day ${String(day)} of 7`,
    adaptationIntro: (date: string) =>
      `You can do almost everything from day one. Until ${date} you have two limits:`,
    halfDamage: 'Your war damage counts at half',
    halfDamageBody: 'You can fight and earn experience and rank as usual.',
    noVote: 'You do not vote in elections yet',
    noVoteBody:
      'Members of Congress vote on laws. You can give your opinion in the press and write to them.',
    votesFrom: (date: string) => `You vote in elections from ${date}.`,
    waitlistTitle: 'Waitlist',
    waitlistBody: (country: string, place: number) =>
      `You are waiting for ${country}: you are number ${String(place)} on the list. When it opens, we email you and you move with everything you have.`,
    leaveWaitlist: 'Stop waiting',
    requestTitle: 'Change of country',
    requestPending: (country: string, date: string) =>
      `You asked for citizenship of ${country}. If nobody answers before, it is approved on ${date}.`,
    requestRejected: (country: string) => `${country} rejected your citizenship request.`,
    cancelRequest: 'Cancel the request',
    change: 'Change country',
    nextChange: (date: string) => `You can change country again from ${date}.`,
    reviewRequests: 'See citizenship requests',
    actionFailed: 'It could not be done. Try again in a few minutes.',
  },
});
