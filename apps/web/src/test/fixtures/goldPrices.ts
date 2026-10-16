import type { PublicGoldPrice } from '../../features/prices/queries';

/** The GOLD prices as get_gold_prices returns them with the values the game started with. */
export const goldPriceRows: PublicGoldPrice[] = [
  {
    key: 'company_level_1',
    category: 'companies',
    price: 1000,
    beneficiary: 'host_country',
    country_share_bp: 0,
  },
  {
    key: 'party_founding',
    category: 'politics',
    price: 5000,
    beneficiary: 'party_country',
    country_share_bp: 0,
  },
  {
    key: 'presidential_ticket',
    category: 'politics',
    price: 2000,
    beneficiary: 'party_country',
    country_share_bp: 5000,
  },
  {
    key: 'party_list',
    category: 'politics',
    price: 1000,
    beneficiary: 'party_country',
    country_share_bp: 5000,
  },
  {
    key: 'hospital_build',
    category: 'health',
    price: 5000,
    beneficiary: 'none',
    country_share_bp: 0,
  },
  {
    key: 'hospital_upgrade_2',
    category: 'health',
    price: 7500,
    beneficiary: 'none',
    country_share_bp: 0,
  },
  {
    key: 'hospital_upgrade_3',
    category: 'health',
    price: 10000,
    beneficiary: 'none',
    country_share_bp: 0,
  },
  {
    key: 'hospital_upgrade_4',
    category: 'health',
    price: 12500,
    beneficiary: 'none',
    country_share_bp: 0,
  },
  {
    key: 'hospital_upgrade_5',
    category: 'health',
    price: 15000,
    beneficiary: 'none',
    country_share_bp: 0,
  },
  {
    key: 'resistance_organizer',
    category: 'war',
    price: 200,
    beneficiary: 'restore_country',
    country_share_bp: 0,
  },
];

/** The answer to give `get_gold_prices` in answerRpc. */
export const goldPricesAnswer = { get_gold_prices: { data: goldPriceRows, error: null } };
