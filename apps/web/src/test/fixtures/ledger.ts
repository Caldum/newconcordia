import type { Balance, Movement } from '../../features/ledger/queries';

/** Camila's balances as get_my_balances returns them: Gold first, then her Credit, then others held. */
export const balanceRows: Balance[] = [
  { currency_code: 'GOLD', country_code: null, balance: 124000 },
  { currency_code: 'ARG', country_code: 'ARG', balance: 3845004 },
  { currency_code: 'ESP', country_code: 'ESP', balance: 1200 },
];

/** Her latest movements, newest first. */
export const movementRows: Movement[] = [
  {
    posting_id: 3,
    created_at: '2026-10-09T16:52:00Z',
    kind: 'transfer',
    memo: 'Por las raciones',
    currency_code: 'ARG',
    amount: -1250,
    balance_after: 3845004,
    counterparty_kind: 'citizen',
    counterparty_name: 'Marcos Villalba',
    counterparty_country_code: null,
  },
  {
    posting_id: 2,
    created_at: '2026-10-08T12:00:00Z',
    kind: 'welcome_grant',
    memo: null,
    currency_code: 'GOLD',
    amount: 500,
    balance_after: 500,
    counterparty_kind: 'issuer',
    counterparty_name: null,
    counterparty_country_code: null,
  },
  {
    posting_id: 1,
    created_at: '2026-10-08T12:00:00Z',
    kind: 'welcome_grant',
    memo: null,
    currency_code: 'ARG',
    amount: 5000,
    balance_after: 5000,
    counterparty_kind: 'issuer',
    counterparty_name: null,
    counterparty_country_code: null,
  },
];
