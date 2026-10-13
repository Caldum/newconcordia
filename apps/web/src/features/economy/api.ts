import { supabase } from '../../lib/supabase';

// Economy actions (work, jobs and companies). Each takes the idempotency key when the database needs one.

export function work(key: string, companyId?: number) {
  return supabase.rpc('work', {
    p_key: key,
    ...(companyId === undefined ? {} : { p_company_id: companyId }),
  });
}

export function takeJob(companyId: number) {
  return supabase.rpc('take_job', { p_company_id: companyId });
}

export function leaveJob() {
  return supabase.rpc('leave_job');
}

export interface FoundCompany {
  name: string;
  goodCode: string;
  regionCode: string;
}

export function foundCompany({ name, goodCode, regionCode }: FoundCompany, key: string) {
  return supabase.rpc('found_company', {
    p_name: name,
    p_good_code: goodCode,
    p_region_code: regionCode,
    p_key: key,
  });
}

export function upgradeCompany(companyId: number, key: string) {
  return supabase.rpc('upgrade_company', { p_company_id: companyId, p_key: key });
}

export function upgradeCompanyQuality(companyId: number, key: string) {
  return supabase.rpc('upgrade_company_quality', { p_company_id: companyId, p_key: key });
}

/** Moves money between the owner and the company: `deposit` into its cash, `withdraw` out of it. */
export function moveCompanyCash(
  direction: 'deposit' | 'withdraw',
  companyId: number,
  amount: number,
  key: string,
) {
  return supabase.rpc(direction === 'deposit' ? 'fund_company' : 'withdraw_from_company', {
    p_company_id: companyId,
    p_amount: amount,
    p_key: key,
  });
}

export function setCompanyOffer(companyId: number, wage: number, vacancies: number) {
  return supabase.rpc('set_company_offer', {
    p_company_id: companyId,
    p_wage: wage,
    p_vacancies: vacancies,
  });
}

/** Moves whole units between a company's depot and its owner's inventory. */
export function moveGoods(
  companyId: number,
  goodCode: string,
  quantity: number,
  toInventory: boolean,
) {
  return supabase.rpc('move_goods', {
    p_company_id: companyId,
    p_good_code: goodCode,
    p_quantity: quantity,
    p_to_inventory: toInventory,
  });
}
