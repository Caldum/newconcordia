/** A place the player can sell from: their inventory or one company's depot, for one good. */
export interface SellSource {
  id: string;
  good: string;
  /** Whole units that can be offered. */
  available: number;
  /** The depot's company; null for the player's inventory. */
  company: { id: number; name: string } | null;
}

interface StockLine {
  good_code: string;
  quantity: number;
}

interface Depot {
  company: { id: number; name: string };
  stock: readonly StockLine[];
}

/** Everything the player can offer: the inventory first, then each depot; only whole units. */
export function sellSources(
  inventory: readonly StockLine[],
  depots: readonly Depot[],
): SellSource[] {
  const fromInventory = inventory.map((line) => ({
    id: `inventory:${line.good_code}`,
    good: line.good_code,
    available: Math.floor(line.quantity),
    company: null,
  }));
  const fromDepots = depots.flatMap(({ company, stock }) =>
    stock.map((line) => ({
      id: `company:${String(company.id)}:${line.good_code}`,
      good: line.good_code,
      available: Math.floor(line.quantity),
      company,
    })),
  );
  return [...fromInventory, ...fromDepots].filter((source) => source.available > 0);
}
