import { supabase } from '../../lib/supabase';

import type { FxSide } from './rates';

// Foreign exchange and the Central Bank. Posting and taking carry the idempotency key; `centralBank` makes the
// governor act with the Central Bank's funds (the database checks the office).

export interface NewFxOffer {
  currency: string;
  side: FxSide;
  /** Hundredths of GOLD. */
  gold: number;
  /** Hundredths of the currency per 1 GOLD. */
  price: number;
  centralBank: boolean;
}

export function postFxOffer(offer: NewFxOffer, key: string) {
  return supabase.rpc('fx_post_offer', {
    p_currency: offer.currency,
    p_side: offer.side,
    p_gold_amount: offer.gold,
    p_price: offer.price,
    p_key: key,
    p_central_bank: offer.centralBank,
  });
}

export interface FxTake {
  offerId: number;
  /** Hundredths of GOLD. */
  gold: number;
  centralBank: boolean;
}

export function takeFxOffer(take: FxTake, key: string) {
  return supabase.rpc('fx_take', {
    p_offer_id: take.offerId,
    p_gold_amount: take.gold,
    p_key: key,
    p_central_bank: take.centralBank,
  });
}

export function cancelFxOffer(offerId: number) {
  return supabase.rpc('fx_cancel', { p_offer_id: offerId });
}

export interface BankTransfer {
  currency: string;
  /** Hundredths. */
  amount: number;
}

export function centralBankToTreasury(transfer: BankTransfer, key: string) {
  return supabase.rpc('central_bank_to_treasury', {
    p_currency: transfer.currency,
    p_amount: transfer.amount,
    p_key: key,
  });
}

export interface Authorization {
  companyName: string;
  currency: string;
  /** Hundredths. */
  amount: number;
}

export function authorizeBankTransfer(authorization: Authorization) {
  return supabase.rpc('authorize_cb_transfer', {
    p_company_name: authorization.companyName,
    p_currency: authorization.currency,
    p_amount: authorization.amount,
  });
}

export function cancelAuthorization(authorizationId: number) {
  return supabase.rpc('cancel_cb_authorization', { p_authorization_id: authorizationId });
}

export function executeAuthorization(authorizationId: number) {
  return supabase.rpc('execute_cb_transfer', { p_authorization_id: authorizationId });
}
