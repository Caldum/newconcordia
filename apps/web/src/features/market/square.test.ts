import { describe, expect, it } from 'vitest';

import {
  changeOf,
  firstGoodOf,
  goodsOf,
  quantityIn,
  setLine,
  sortOffers,
  ticketTotals,
} from './square';
import type { TicketLine } from './square';

const line = (offerId: number, quantity: number, extra: Partial<TicketLine> = {}): TicketLine => ({
  offerId,
  goodCode: 'food_q1',
  sellerName: 'Bot Belgrano',
  price: 100,
  quantity,
  available: 10,
  imported: false,
  tariff: 0.1,
  ...extra,
});

describe('the market square filters', () => {
  it('lists five qualities per category, and the three raw materials', () => {
    expect(goodsOf('food')).toEqual(['food_q1', 'food_q2', 'food_q3', 'food_q4', 'food_q5']);
    expect(goodsOf('military')[2]).toBe('weapon_q3');
    expect(goodsOf('medical')[4]).toBe('kit_q5');
    expect(goodsOf('raw')).toEqual(['food_raw', 'military_raw', 'medical_raw']);
  });

  it('starts every category on its first good, never on all of them', () => {
    expect(firstGoodOf('food')).toBe('food_q1');
    expect(firstGoodOf('raw')).toBe('food_raw');
  });

  it('sorts by price either way or by quantity, the oldest offer first on ties', () => {
    const offers = [
      { offer_id: 3, price: 120, quantity: 5 },
      { offer_id: 1, price: 100, quantity: 50 },
      { offer_id: 2, price: 100, quantity: 8 },
    ];
    expect(sortOffers(offers, 'cheapest').map((o) => o.offer_id)).toEqual([1, 2, 3]);
    expect(sortOffers(offers, 'dearest').map((o) => o.offer_id)).toEqual([3, 1, 2]);
    expect(sortOffers(offers, 'largest').map((o) => o.offer_id)).toEqual([1, 2, 3]);
  });
});

describe('the ticket', () => {
  it('adds, changes and removes lines in place', () => {
    let ticket = setLine([], line(1, 2));
    ticket = setLine(ticket, line(2, 1, { goodCode: 'weapon_q3' }));
    ticket = setLine(ticket, line(1, 5));
    expect(ticket.map((l) => [l.offerId, l.quantity])).toEqual([
      [1, 5],
      [2, 1],
    ]);
    expect(quantityIn(ticket, 1)).toBe(5);
    expect(setLine(ticket, line(1, 0)).map((l) => l.offerId)).toEqual([2]);
    expect(quantityIn([], 9)).toBe(0);
  });

  it('never asks for more than the offer has', () => {
    expect(setLine([], line(1, 99))[0]?.quantity).toBe(10);
  });

  it('adds up every line as the database charges it', () => {
    const ticket = [line(1, 3), line(2, 2, { price: 250, imported: true })];
    expect(ticketTotals(ticket, 0.05)).toEqual({
      units: 5,
      gross: 800,
      vat: 38,
      tariff: 50,
      total: 850,
    });
  });
});

describe('changeOf', () => {
  it('compares with the period before, when there is one', () => {
    expect(changeOf(1084, 1000)).toBeCloseTo(0.084);
    expect(changeOf(500, 0)).toBeNull();
    expect(changeOf(null, 100)).toBeNull();
  });
});
