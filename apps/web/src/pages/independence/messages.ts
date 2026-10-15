import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Guerra de independencia · Concordia',
    title: (country: string) => `Guerra de independencia de ${country}`,
    live: 'En vivo',
    noWar: 'Tu país no tiene una guerra de independencia en curso.',
    backToBattles: 'Volver a Batallas',
    loadFailed: 'No se pudo cargar la guerra. Vuelve a intentar en un momento.',
    // Board
    boardSummary: (country: string, percent: number, left: string) =>
      `${country} lleva el ${String(percent)} % de la meta. Quedan ${left}.`,
    ownRole: 'Lucha por su independencia',
    occupier: 'Ocupante',
    occupierRole: 'Resiste mientras falte daño',
    progress: (total: string, target: string) => `${total} de ${target} de daño`,
    endsIn: (left: string) => `Termina en ${left} o al llegar a la meta`,
    won: (hero: string | null) =>
      hero ? `¡Independencia ganada! Héroe Libertador: ${hero}.` : '¡Independencia ganada!',
    expired: 'La guerra terminó sin llegar a la meta.',
    closing: 'La guerra terminó; se está cerrando.',
    silhouette: (country: string) => `Mapa de ${country}`,
    // Strike
    strikeTitle: (country: string) => `Tu golpe por ${country}`,
    energy: 'Energía',
    energyText: (energy: number) => `${String(energy)} de 100`,
    health: (health: number) => `Salud ${String(health)} de 100`,
    weapon: (name: string, uses: number) =>
      uses === 1 ? `${name}, le queda 1 uso` : `${name}, le quedan ${String(uses)} usos`,
    unarmed: 'Sin arma. Equipa una en Batallas para pegar más fuerte.',
    perStrike: (damage: string) => `${damage} de daño por golpe`,
    strike: 'Golpear',
    burst: '5 golpes seguidos',
    lowEnergy:
      'Te queda poca energía. La comida automática te devuelve 10 cada 5 minutos mientras tengas raciones.',
    noHealth: 'Con salud 0 no puedes pelear. Usa un botiquín en el hospital.',
    struck: (damage: number) => `Golpeaste: ${String(damage)} de daño.`,
    burstDone: (strikes: number, damage: number) =>
      `${String(strikes)} golpes, ${String(damage)} de daño.`,
    injured: (hp: number) => ` Te heriste: −${String(hp)} de salud.`,
    stopped: 'Paraste antes: ',
    // My share
    mineTitle: 'Tu parte',
    myDamage: 'Tu daño',
    myStrikes: 'Tus golpes',
    myPlace: 'Tu puesto',
    place: (place: number, of: number) => `${String(place)} de ${String(of)}`,
    noPlace: 'Todavía no peleaste',
    // Feed
    feedTitle: 'Últimos golpes',
    feedEmpty: 'Todavía nadie golpeó. Sé el primero.',
    you: 'Tú',
    hit: (damage: string) => `${damage} de daño`,
    hurt: (hp: number) => `−${String(hp)} salud`,
    ago: (seconds: number) =>
      seconds < 5
        ? 'ahora'
        : seconds < 60
          ? `hace ${String(seconds)} s`
          : `hace ${String(Math.floor(seconds / 60))} min`,
    // Pulse
    pulseTitle: 'Ritmo de la batalla',
    pulseHint: 'Daño por minuto, últimos 30 minutos.',
    pulseSummary: (damage: string, strikes: number, fighters: number) =>
      `Último minuto: ${damage} de daño en ${String(strikes)} golpes de ${String(fighters)} ciudadanos.`,
    pulseBar: (time: string, damage: string) => `${time}: ${damage} de daño`,
    // Heroes
    heroesTitle: 'Héroes de la guerra',
    heroesHint: 'Quien vaya primero cuando termine la guerra recibe el título de Héroe Libertador.',
    heroesEmpty: 'Todavía no hay héroes.',
    heroLine: (damage: string, attacks: number) =>
      `${damage} de daño · ${String(attacks)} ${attacks === 1 ? 'golpe' : 'golpes'}`,
    error_war_closed: 'La guerra de independencia terminó.',
    error_war_not_found: 'Esa guerra no existe.',
    error_not_eligible: 'Solo pelean los ciudadanos del país.',
    error_health_zero: 'Con salud 0 no puedes atacar. Usa un botiquín.',
    error_not_enough_energy: 'Necesitas 10 de energía.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    documentTitle: 'Independence war · Concordia',
    title: (country: string) => `${country}'s independence war`,
    live: 'Live',
    noWar: 'Your country has no independence war under way.',
    backToBattles: 'Back to Battles',
    loadFailed: 'The war did not load. Try again in a moment.',
    boardSummary: (country: string, percent: number, left: string) =>
      `${country} is at ${String(percent)}% of the target. ${left} left.`,
    ownRole: 'Fights for its independence',
    occupier: 'Occupier',
    occupierRole: 'Holds while damage is missing',
    progress: (total: string, target: string) => `${total} of ${target} damage`,
    endsIn: (left: string) => `Ends in ${left} or on reaching the target`,
    won: (hero: string | null) =>
      hero ? `Independence won! Liberating Hero: ${hero}.` : 'Independence won!',
    expired: 'The war ended without reaching the target.',
    closing: 'The war is over; being closed.',
    silhouette: (country: string) => `Map of ${country}`,
    strikeTitle: (country: string) => `Your strike for ${country}`,
    energy: 'Energy',
    energyText: (energy: number) => `${String(energy)} of 100`,
    health: (health: number) => `Health ${String(health)} of 100`,
    weapon: (name: string, uses: number) =>
      uses === 1 ? `${name}, 1 use left` : `${name}, ${String(uses)} uses left`,
    unarmed: 'Unarmed. Equip a weapon in Battles to hit harder.',
    perStrike: (damage: string) => `${damage} damage per strike`,
    strike: 'Strike',
    burst: '5 strikes in a row',
    lowEnergy:
      'Your energy is low. Automatic food gives back 10 every 5 minutes while you have rations.',
    noHealth: 'With 0 health you cannot fight. Use a kit at the hospital.',
    struck: (damage: number) => `You struck: ${String(damage)} damage.`,
    burstDone: (strikes: number, damage: number) =>
      `${String(strikes)} strikes, ${String(damage)} damage.`,
    injured: (hp: number) => ` You got hurt: −${String(hp)} health.`,
    stopped: 'You stopped early: ',
    mineTitle: 'Your share',
    myDamage: 'Your damage',
    myStrikes: 'Your strikes',
    myPlace: 'Your place',
    place: (place: number, of: number) => `${String(place)} of ${String(of)}`,
    noPlace: 'You have not fought yet',
    feedTitle: 'Latest strikes',
    feedEmpty: 'Nobody has struck yet. Be the first.',
    you: 'You',
    hit: (damage: string) => `${damage} damage`,
    hurt: (hp: number) => `−${String(hp)} health`,
    ago: (seconds: number) =>
      seconds < 5
        ? 'now'
        : seconds < 60
          ? `${String(seconds)} s ago`
          : `${String(Math.floor(seconds / 60))} min ago`,
    pulseTitle: 'Battle pace',
    pulseHint: 'Damage per minute, last 30 minutes.',
    pulseSummary: (damage: string, strikes: number, fighters: number) =>
      `Last minute: ${damage} damage in ${String(strikes)} strikes by ${String(fighters)} citizens.`,
    pulseBar: (time: string, damage: string) => `${time}: ${damage} damage`,
    heroesTitle: 'War heroes',
    heroesHint: 'Whoever leads at the end becomes the Liberating Hero.',
    heroesEmpty: 'No heroes yet.',
    heroLine: (damage: string, attacks: number) =>
      `${damage} damage · ${String(attacks)} ${attacks === 1 ? 'strike' : 'strikes'}`,
    error_war_closed: 'The independence war is over.',
    error_war_not_found: 'That war does not exist.',
    error_not_eligible: 'Only the country’s citizens fight.',
    error_health_zero: 'With 0 health you cannot attack. Use a kit.',
    error_not_enough_energy: 'You need 10 energy.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});
