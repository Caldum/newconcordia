import { supabase } from '../../lib/supabase';

// Ministerial spending. Both take the idempotency key; the database checks the office, competences and funds.

export interface MinistryPayment {
  /** GOLD or the national currency. */
  currency: string;
  /** Hundredths. */
  amount: number;
  /** A national, by name. */
  citizenName: string;
  concept: string;
}

export function ministryPay(payment: MinistryPayment, key: string) {
  return supabase.rpc('ministry_pay', {
    p_currency: payment.currency,
    p_amount: payment.amount,
    p_citizen_name: payment.citizenName,
    p_concept: payment.concept,
    p_key: key,
  });
}

export interface MinistryPurchase {
  offerId: number;
  quantity: number;
}

export function ministryBuy(purchase: MinistryPurchase, key: string) {
  return supabase.rpc('ministry_buy', {
    p_offer_id: purchase.offerId,
    p_quantity: purchase.quantity,
    p_key: key,
  });
}
