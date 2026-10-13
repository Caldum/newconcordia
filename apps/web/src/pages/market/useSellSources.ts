import { useCompanyStocks, useMyCompanies } from '../../features/economy/queries';
import { useMyInventory } from '../../features/market/queries';
import { sellSources } from '../../features/market/sellSources';
import type { SellSource } from '../../features/market/sellSources';

/** Every place the player can sell from: their inventory and each company's depot. */
export function useSellSources(): SellSource[] {
  const inventory = useMyInventory();
  const companies = useMyCompanies().data ?? [];
  const stocks = useCompanyStocks(companies.map((company) => company.id));
  return sellSources(
    inventory.data ?? [],
    companies.map((company, index) => ({
      company: { id: company.id, name: company.name },
      stock: stocks[index]?.data ?? [],
    })),
  );
}
