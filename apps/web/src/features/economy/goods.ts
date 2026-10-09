import { defineMessages, useMessages } from '../../i18n';

const messages = defineMessages({
  es: {
    wheat: 'Trigo',
    iron: 'Hierro',
    oil: 'Petróleo',
    ration: 'Raciones',
    fuel: 'Combustible',
    weapon: (quality: number) => `Armas Q${String(quality)}`,
    unknown: 'Bienes',
  },
  en: {
    wheat: 'Wheat',
    iron: 'Iron',
    oil: 'Oil',
    ration: 'Rations',
    fuel: 'Fuel',
    weapon: (quality: number) => `Weapons Q${String(quality)}`,
    unknown: 'Goods',
  },
});

/** «Trigo», «Armas Q3»: the name of a good code in the player's language. */
export function useGoodName(): (code: string) => string {
  const copy = useMessages(messages);
  return (code) => {
    const weapon = /^weapon_q([1-5])$/.exec(code);
    if (weapon) return copy.weapon(Number(weapon[1]));
    if (
      code === 'wheat' ||
      code === 'iron' ||
      code === 'oil' ||
      code === 'ration' ||
      code === 'fuel'
    ) {
      return copy[code];
    }
    return copy.unknown;
  };
}

/** Raw materials depend on the region's deposits; products do not. */
export function isRaw(code: string): boolean {
  return code === 'wheat' || code === 'iron' || code === 'oil';
}
