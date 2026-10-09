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
      'Cada batalla tiene hasta 5 rondas de 4 horas. Gana el bando que hace más daño en 3 rondas.',
    voteTitle: 'Votas',
    voteBody:
      'Cada 15 días eliges presidente o Congreso. Los congresistas votan las leyes, los impuestos y las guerras.',
    waitingTitle: 'Tu país te está esperando',
    create: 'Crear mi ciudadano',
    footer: 'Pie de página',
    gameTime: 'Hora del juego: GMT−3',
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
    fightBody:
      'Each battle has up to 5 rounds of 4 hours. The side that does more damage in 3 rounds wins.',
    voteTitle: 'You vote',
    voteBody:
      'Every 15 days you elect the president or Congress. Members of Congress vote on laws, taxes and wars.',
    waitingTitle: 'Your country is waiting for you',
    create: 'Create my citizen',
    footer: 'Footer',
    gameTime: 'Game time: GMT−3',
  },
});
