import { purchaseTotals } from './totals';

/** The market square's filters (ADR 0048): a category, then a quality (or which raw material). */
export type MarketCategory = 'food' | 'military' | 'medical' | 'raw';

export const MARKET_CATEGORIES: readonly MarketCategory[] = ['food', 'military', 'medical', 'raw'];

/** The goods a category lists, in the order of its second row of filters. */
export function goodsOf(category: MarketCategory): readonly string[] {
  if (category === 'raw') return ['food_raw', 'military_raw', 'medical_raw'];
  const prefix = category === 'food' ? 'food_q' : category === 'military' ? 'weapon_q' : 'kit_q';
  return [1, 2, 3, 4, 5].map((quality) => `${prefix}${String(quality)}`);
}

/** The first good of a category: a category always shows one good, Q1 first. */
export function firstGoodOf(category: MarketCategory): string {
  return goodsOf(category)[0] ?? 'food_q1';
}

export type OfferSort = 'cheapest' | 'dearest' | 'largest';

interface SortableOffer {
  offer_id: number;
  price: number;
  quantity: number;
}

/** Offers in the chosen order; ties keep the oldest offer first. */
export function sortOffers<Offer extends SortableOffer>(
  offers: readonly Offer[],
  sort: OfferSort,
): Offer[] {
  const by = {
    cheapest: (a: Offer, b: Offer) => a.price - b.price,
    dearest: (a: Offer, b: Offer) => b.price - a.price,
    largest: (a: Offer, b: Offer) => b.quantity - a.quantity,
  }[sort];
  return [...offers].sort((a, b) => by(a, b) || a.offer_id - b.offer_id);
}

/** One line of the ticket: units of one offer, with what is needed to show and charge it. */
export interface TicketLine {
  offerId: number;
  goodCode: string;
  sellerName: string;
  /** Hundredths per unit, VAT included. */
  price: number;
  quantity: number;
  /** Units the offer has; the line never asks for more. */
  available: number;
  imported: boolean;
  tariff: number;
}

export type Ticket = readonly TicketLine[];

/** The ticket with this offer's line at `quantity` units (0 takes it out), within what the offer has. */
export function setLine(ticket: Ticket, line: TicketLine): Ticket {
  const quantity = Math.min(Math.max(0, Math.floor(line.quantity)), line.available);
  const rest = ticket.filter((current) => current.offerId !== line.offerId);
  if (quantity === 0) return rest;
  const index = ticket.findIndex((current) => current.offerId === line.offerId);
  const next = { ...line, quantity };
  if (index === -1) return [...rest, next];
  return [...rest.slice(0, index), next, ...rest.slice(index)];
}

/** Units of an offer already in the ticket. */
export function quantityIn(ticket: Ticket, offerId: number): number {
  return ticket.find((line) => line.offerId === offerId)?.quantity ?? 0;
}

/** What the ticket costs, as the database charges each line: VAT inside the price, the tariff on imports. */
export function ticketTotals(ticket: Ticket, vat: number) {
  return ticket.reduce(
    (sum, line) => {
      const totals = purchaseTotals(line.price, line.quantity, vat, line.tariff, line.imported);
      return {
        units: sum.units + line.quantity,
        gross: sum.gross + totals.gross,
        vat: sum.vat + totals.vat,
        tariff: sum.tariff + totals.tariff,
        total: sum.total + totals.total,
      };
    },
    { units: 0, gross: 0, vat: 0, tariff: 0, total: 0 },
  );
}

/** Change against the previous period as a share (0.084 = +8,4 %); null when there is nothing to compare. */
export function changeOf(now: number | null, before: number | null): number | null {
  if (now === null || before === null || before === 0) return null;
  return (now - before) / before;
}
