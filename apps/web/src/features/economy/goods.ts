import { defineMessages, useMessages } from '../../i18n';

const messages = defineMessages({
  es: {
    food_raw: 'Materia prima alimentaria',
    military_raw: 'Materia prima militar',
    medical_raw: 'Materia prima médica',
    food: (quality: number) => `Comida Q${String(quality)}`,
    weapon: (quality: number) => `Armas Q${String(quality)}`,
    kit: (quality: number) => `Botiquines Q${String(quality)}`,
    // Retired goods (before specification v3.1), still named in old offers and trades.
    wheat: 'Trigo',
    iron: 'Hierro',
    oil: 'Petróleo',
    ration: 'Raciones',
    fuel: 'Combustible',
    unknown: 'Bienes',
  },
  en: {
    food_raw: 'Food raw material',
    military_raw: 'Military raw material',
    medical_raw: 'Medical raw material',
    food: (quality: number) => `Food Q${String(quality)}`,
    weapon: (quality: number) => `Weapons Q${String(quality)}`,
    kit: (quality: number) => `Medical kits Q${String(quality)}`,
    wheat: 'Wheat',
    iron: 'Iron',
    oil: 'Oil',
    ration: 'Rations',
    fuel: 'Fuel',
    unknown: 'Goods',
  },
});

const named = new Set([
  'food_raw',
  'military_raw',
  'medical_raw',
  'wheat',
  'iron',
  'oil',
  'ration',
  'fuel',
] as const);
type Named = typeof named extends Set<infer Code> ? Code : never;

/** Quality 1–5 of a food, weapon or kit code; null for everything else. */
export function qualityOf(code: string): number | null {
  const match = /^(?:food|weapon|kit)_q([1-5])$/.exec(code);
  return match ? Number(match[1]) : null;
}

/** «Materia prima militar», «Armas Q3»: the name of a good code in the player's language. */
export function useGoodName(): (code: string) => string {
  const copy = useMessages(messages);
  return (code) => {
    const quality = qualityOf(code);
    if (quality !== null) {
      if (code.startsWith('food_')) return copy.food(quality);
      if (code.startsWith('kit_')) return copy.kit(quality);
      return copy.weapon(quality);
    }
    return named.has(code as Named) ? copy[code as Named] : copy.unknown;
  };
}

/** Raw materials come from extraction; products are made from them. */
export function isRaw(code: string): boolean {
  return code.endsWith('_raw') || code === 'wheat' || code === 'iron' || code === 'oil';
}

/** Food, military or medical: the raw material a good is, or the one its line is made from. */
export function categoryOf(code: string): 'food' | 'military' | 'medical' {
  if (code.startsWith('food_')) return 'food';
  if (code.startsWith('kit_') || code === 'medical_raw') return 'medical';
  return 'military';
}
