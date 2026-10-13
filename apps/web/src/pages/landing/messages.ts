import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Concordia · Juego de estrategia en el navegador',
    homeLabel: 'Concordia, ir al inicio',
    nav: 'Principal',
    signIn: 'Iniciar sesión',
    signUp: 'Crear cuenta',
    title: 'El mundo está cambiando',
    lead: 'Únete ahora y lleva a tu país a lo más alto.',
    choose: 'Elegir mi país',
    seeMap: 'Ver el mapa',
    inPlay: (count: number) => `${String(count)} países en juego`,
    dayTitle: 'Un día en Concordia',
    workTitle: 'Trabajas',
    workBody: 'Tu jornada produce para una empresa de tu país, que te paga el salario.',
    trainTitle: 'Entrenas',
    trainBody:
      'Puedes entrenar una vez al día. Cada entrenamiento sube tu fuerza, que multiplica tu daño.',
    fightTitle: 'Combates',
    fightBody:
      'Cada batalla tiene hasta 9 rondas de 1 hora. Gana el primer bando que se lleva 5 rondas.',
    voteTitle: 'Votas',
    voteBody:
      'Cada mes eliges presidente y Congreso. Los congresistas votan las leyes, los impuestos y las guerras.',
    waitingTitle: 'Tu país te está esperando',
    create: 'Crear mi ciudadano',
    footer: 'Pie de página',
    gameTime: 'Hora del juego: UTC',
  },
  en: {
    documentTitle: 'Concordia · Strategy game in the browser',
    homeLabel: 'Concordia, go to home',
    nav: 'Main',
    signIn: 'Sign in',
    signUp: 'Create account',
    title: 'The world is changing',
    lead: 'Join now and take your country to the top.',
    choose: 'Choose my country',
    seeMap: 'See the map',
    inPlay: (count: number) => `${String(count)} countries in play`,
    dayTitle: 'A day in Concordia',
    workTitle: 'You work',
    workBody: 'Your shift produces for a company in your country, which pays your wage.',
    trainTitle: 'You train',
    trainBody:
      'You can train once a day. Each session raises your strength, which multiplies your damage.',
    fightTitle: 'You fight',
    fightBody: 'Each battle has up to 9 rounds of 1 hour. The first side to win 5 rounds takes it.',
    voteTitle: 'You vote',
    voteBody:
      'Every month you elect the president and Congress. Members of Congress vote on laws, taxes and wars.',
    waitingTitle: 'Your country is waiting for you',
    create: 'Create my citizen',
    footer: 'Footer',
    gameTime: 'Game time: UTC',
  },
});
