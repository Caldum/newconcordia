import { defineMessages, useMessages } from '../../i18n';

const messages = defineMessages({
  es: {
    wheat: 'trigo',
    corn: 'maíz',
    rice: 'arroz',
    cattle: 'ganado',
    fish: 'pesca',
    iron: 'hierro',
    copper: 'cobre',
    coal: 'carbón',
    sulfur: 'azufre',
    oil: 'petróleo',
    cotton: 'algodón',
    latex: 'látex',
    medicinal_plants: 'plantas medicinales',
    salt: 'sal',
    silica_sand: 'arena de sílice',
  },
  en: {
    wheat: 'wheat',
    corn: 'corn',
    rice: 'rice',
    cattle: 'cattle',
    fish: 'fish',
    iron: 'iron',
    copper: 'copper',
    coal: 'coal',
    sulfur: 'sulfur',
    oil: 'oil',
    cotton: 'cotton',
    latex: 'latex',
    medicinal_plants: 'medicinal plants',
    salt: 'salt',
    silica_sand: 'silica sand',
  },
});

type ResourceCode = keyof (typeof messages)['es'];

/** «trigo», «plantas medicinales»: a resource code in the player's language. */
export function useResourceName(): (code: string) => string {
  const copy = useMessages(messages);
  return (code) => (code in copy ? copy[code as ResourceCode] : code);
}
