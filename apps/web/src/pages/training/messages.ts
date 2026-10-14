import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Entrenamiento · Concordia',
    title: 'Entrenamiento',
    intro:
      'Tienes tres centros propios. En cada uno entrenas una vez por día (UTC): ganas fuerza militar y 1 de experiencia civil por cada punto. Después puede haber una lesión de 5 de salud; con salud 0 no puedes entrenar.',
    loadFailed: 'No se pudo cargar tu entrenamiento. Recarga la página para intentar de nuevo.',
    center_basic: 'Centro básico',
    center_advanced: 'Centro avanzado',
    center_elite: 'Centro de élite',
    level: (level: number) => `Nivel ${String(level)}`,
    gain: (strength: number) => `+${String(strength)} de fuerza`,
    cost: (energy: number, fee: string) =>
      fee === '' ? `${String(energy)} de energía` : `${String(energy)} de energía y ${fee} Oro`,
    injury: (chance: string) => `Riesgo de lesión: ${chance}`,
    train: 'Entrenar',
    trainAria: (center: string) => `Entrenar en el ${center.toLowerCase()}`,
    trainedToday: 'Ya entrenaste hoy. Vuelve después de las 00:00 UTC.',
    trained: (strength: number) => `Ganaste ${String(strength)} de fuerza.`,
    trainedInjured: (strength: number, lost: number) =>
      `Ganaste ${String(strength)} de fuerza, pero te lesionaste: perdiste ${String(lost)} de salud.`,
    upgrade: (cost: string) => `Mejorar por ${cost} Oro`,
    upgradeAria: (center: string, cost: string) =>
      `Mejorar el ${center.toLowerCase()} por ${cost} Oro`,
    upgraded: (level: number) => `El centro ahora es nivel ${String(level)}.`,
    levelMax: 'Nivel máximo.',
    injuriesTitle: 'Tus lesiones',
    noInjuries: 'No tuviste lesiones.',
    injuryLine: (cause: string, lost: number, after: number) =>
      `${cause}: −${String(lost)} de salud, quedaste en ${String(after)}`,
    cause_training: 'Entrenamiento',
    cause_attack: 'Combate',
    error_center_invalid: 'Ese centro no existe.',
    error_already_trained: 'Ya entrenaste hoy en ese centro.',
    error_health_zero: 'Con salud 0 no puedes entrenar. Usa un botiquín.',
    error_not_enough_energy: 'No tienes energía suficiente.',
    error_insufficient_funds: 'No tienes Oro suficiente.',
    error_level_max: 'El centro ya está en el nivel máximo.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    documentTitle: 'Training · Concordia',
    title: 'Training',
    intro:
      'You own three centers. You train once a day (UTC) in each: you gain military strength and 1 civil XP per point. Afterwards an injury of 5 health may happen; at 0 health you cannot train.',
    loadFailed: 'Your training did not load. Reload the page to try again.',
    center_basic: 'Basic center',
    center_advanced: 'Advanced center',
    center_elite: 'Elite center',
    level: (level: number) => `Level ${String(level)}`,
    gain: (strength: number) => `+${String(strength)} strength`,
    cost: (energy: number, fee: string) =>
      fee === '' ? `${String(energy)} energy` : `${String(energy)} energy and ${fee} Gold`,
    injury: (chance: string) => `Injury risk: ${chance}`,
    train: 'Train',
    trainAria: (center: string) => `Train at the ${center.toLowerCase()}`,
    trainedToday: 'You trained today. Come back after 00:00 UTC.',
    trained: (strength: number) => `You gained ${String(strength)} strength.`,
    trainedInjured: (strength: number, lost: number) =>
      `You gained ${String(strength)} strength, but got injured: you lost ${String(lost)} health.`,
    upgrade: (cost: string) => `Upgrade for ${cost} Gold`,
    upgradeAria: (center: string, cost: string) =>
      `Upgrade the ${center.toLowerCase()} for ${cost} Gold`,
    upgraded: (level: number) => `The center is now level ${String(level)}.`,
    levelMax: 'Top level.',
    injuriesTitle: 'Your injuries',
    noInjuries: 'You have had no injuries.',
    injuryLine: (cause: string, lost: number, after: number) =>
      `${cause}: −${String(lost)} health, down to ${String(after)}`,
    cause_training: 'Training',
    cause_attack: 'Combat',
    error_center_invalid: 'That center does not exist.',
    error_already_trained: 'You already trained at that center today.',
    error_health_zero: 'At 0 health you cannot train. Use a medical kit.',
    error_not_enough_energy: 'You do not have enough energy.',
    error_insufficient_funds: 'You do not have enough Gold.',
    error_level_max: 'The center is already at the top level.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});
