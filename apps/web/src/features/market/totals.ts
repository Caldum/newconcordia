/** What a purchase costs, as the database charges it: VAT is inside the price, the tariff is on top. */
export function purchaseTotals(
  price: number,
  quantity: number,
  vat: number,
  tariff: number,
  imported: boolean,
) {
  const gross = price * quantity;
  const vatPart = Math.round(gross - gross / (1 + vat));
  const tariffPart = imported ? Math.round(gross * tariff) : 0;
  return { gross, vat: vatPart, tariff: tariffPart, total: gross + tariffPart };
}

/**
 * What a seller receives if everything sells: the gross minus the VAT and the market fee, and in another
 * country's market also the production country's export tax on what is left.
 */
export function saleTotals(
  price: number,
  quantity: number,
  vat: number,
  fee: number,
  exportTax = 0,
) {
  const gross = price * quantity;
  const vatPart = Math.round(gross - gross / (1 + vat));
  const feePart = Math.round(gross * fee);
  const exportPart = Math.round((gross - vatPart - feePart) * exportTax);
  return {
    gross,
    vat: vatPart,
    fee: feePart,
    exportTax: exportPart,
    net: gross - vatPart - feePart - exportPart,
  };
}

export type PurchaseTotals = ReturnType<typeof purchaseTotals>;
export type SaleTotals = ReturnType<typeof saleTotals>;
