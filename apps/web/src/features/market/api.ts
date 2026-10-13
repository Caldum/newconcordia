import { supabase } from '../../lib/supabase';

// Market actions. Each takes the idempotency key when the database needs one.

export interface Purchase {
  offerId: number;
  quantity: number;
  /** Into this own company's depot; the player's inventory when null. */
  companyId: number | null;
}

export function buy({ offerId, quantity, companyId }: Purchase, key: string) {
  return supabase.rpc('buy', {
    p_offer_id: offerId,
    p_quantity: quantity,
    ...(companyId === null ? {} : { p_company_id: companyId }),
    p_key: key,
  });
}

export interface NewOffer {
  goodCode: string;
  quantity: number;
  /** Hundredths per unit, VAT included. */
  price: number;
  marketCountryCode: string;
  /** Sold from this own company's depot; from the player's inventory when null. */
  companyId: number | null;
}

export function postOffer(offer: NewOffer, key: string) {
  return supabase.rpc('post_offer', {
    p_good_code: offer.goodCode,
    p_quantity: offer.quantity,
    p_price: offer.price,
    ...(offer.companyId === null ? {} : { p_company_id: offer.companyId }),
    p_market_country_code: offer.marketCountryCode,
    p_key: key,
  });
}

export function withdrawOffer(offerId: number) {
  return supabase.rpc('withdraw_offer', { p_offer_id: offerId });
}
