import { defineMessages } from '../../i18n';

export const licensesMessages = defineMessages({
  es: {
    documentTitle: 'Licencias de mercado · Concordia',
    title: 'Licencias de mercado',
    intro: (country: string) =>
      `En el mercado de ${country} vendes sin licencia. Para vender en otro país desde aquí necesitas la suya: se paga una vez y es para siempre. Para comprar en otro país no hace falta licencia: viaja y compra en su mercado.`,
    terms: (price: string, share: string, burned: string) =>
      `Cada licencia cuesta ${price} Oro: ${share} van al tesoro de ese país y ${burned} salen del juego.`,
    loadFailed: 'No se pudieron cargar las licencias. Recarga la página para intentar de nuevo.',
    mineTitle: 'Tus licencias',
    noMine: 'Todavía no tienes licencias. Solo comercias en tu país.',
    since: (date: string) => `desde el ${date}`,
    buyTitle: 'Comprar una licencia',
    country: 'Mercado',
    buy: (price: string) => `Comprar por ${price} Oro`,
    bought: (country: string) => `Ya puedes comerciar en el mercado de ${country}.`,
    noneLeft: 'Ya tienes licencia para todos los mercados abiertos.',
    error_insufficient_funds: 'No te alcanza el Oro para esta licencia.',
    error_license_not_needed: 'En el mercado de tu país no necesitas licencia.',
    error_market_invalid: 'Ese mercado no está abierto.',
    error_other:
      'No se pudo completar. Revisa tu conexión y vuelve a intentar: no se cobra dos veces.',
  },
  en: {
    documentTitle: 'Market licenses · Concordia',
    title: 'Market licenses',
    intro: (country: string) =>
      `You sell in the market of ${country} without a license. Selling in another country from here needs theirs: you pay once and it lasts forever. Buying in another country needs no license: travel there and buy in its market.`,
    terms: (price: string, share: string, burned: string) =>
      `Each license costs ${price} Gold: ${share} go to that country's treasury and ${burned} leave the game.`,
    loadFailed: 'The licenses did not load. Reload the page to try again.',
    mineTitle: 'Your licenses',
    noMine: 'You have no licenses yet. You only trade in your country.',
    since: (date: string) => `since ${date}`,
    buyTitle: 'Buy a license',
    country: 'Market',
    buy: (price: string) => `Buy for ${price} Gold`,
    bought: (country: string) => `You can now trade in the market of ${country}.`,
    noneLeft: 'You already hold a license for every open market.',
    error_insufficient_funds: 'Your Gold is not enough for this license.',
    error_license_not_needed: 'Your own country’s market needs no license.',
    error_market_invalid: 'That market is not open.',
    error_other:
      'It did not go through. Check your connection and try again: you are never charged twice.',
  },
});
