import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    title: 'Objetos',
    empty: 'Todavía no tienes objetos. Compra en el mercado o pásalos desde tu empresa.',
    food: (energy: number) => `Da ${String(energy)} de energía.`,
    autoFood: (perMeal: number) =>
      `Comes automáticamente: cada 5 minutos, si te falta energía, comes la comida de menor calidad que alcance y recuperas hasta ${String(perMeal)}.`,
    kit: (health: number) => `Cura ${String(health)} de salud.`,
    weapon: (multiplier: string) => `Multiplica tu daño ×${multiplier}. Se gasta una por golpe.`,
    fuel: 'Ya no se produce: quedó del juego anterior.',
    raw: 'Materia prima. Pásala al depósito de tu empresa o véndela en el mercado.',
    useKit: 'Usar uno',
    useKitLabel: (good: string) => `Usar uno de ${good}`,
    healthFull: 'Tienes la salud completa.',
    healed: (healed: number, health: number) =>
      `Recuperaste ${String(healed)} de salud. Ahora tienes ${String(health)}.`,
    error_health_full: 'Tienes la salud completa: el botiquín se gastaría sin curar.',
    error_quantity_unavailable: 'Ya no te quedan de esos.',
    error_other:
      'No se pudo completar. Revisa tu conexión y vuelve a intentar: no se gasta dos veces.',
  },
  en: {
    title: 'Items',
    empty: 'You have no items yet. Buy on the market or move them from your company.',
    food: (energy: number) => `Gives ${String(energy)} energy.`,
    autoFood: (perMeal: number) =>
      `You eat on your own: every 5 minutes, if you are missing energy, you eat the lowest quality that covers it and recover up to ${String(perMeal)}.`,
    kit: (health: number) => `Heals ${String(health)} health.`,
    weapon: (multiplier: string) => `Multiplies your damage ×${multiplier}. One is spent per hit.`,
    fuel: 'No longer produced: left over from the earlier game.',
    raw: 'Raw material. Move it to your company’s depot or sell it on the market.',
    useKit: 'Use one',
    useKitLabel: (good: string) => `Use one of ${good}`,
    healthFull: 'Your health is full.',
    healed: (healed: number, health: number) =>
      `You recovered ${String(healed)} health. You now have ${String(health)}.`,
    error_health_full: 'Your health is full: the kit would be spent without healing.',
    error_quantity_unavailable: 'You have none of those left.',
    error_other:
      'It did not go through. Check your connection and try again: nothing is spent twice.',
  },
});
