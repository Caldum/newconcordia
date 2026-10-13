import { supabase } from '../../lib/supabase';

export interface Transfer {
  /** The receiving citizen's exact name. */
  toName: string;
  currency: string;
  /** Hundredths. */
  amount: number;
  memo: string;
}

/** Sends money to another citizen; the data is the sender's new balance. Never paid twice per key. */
export function transferMoney(transfer: Transfer, key: string) {
  return supabase.rpc('transfer_money', {
    p_to_name: transfer.toName,
    p_currency: transfer.currency,
    p_amount: transfer.amount,
    p_memo: transfer.memo,
    p_key: key,
  });
}
