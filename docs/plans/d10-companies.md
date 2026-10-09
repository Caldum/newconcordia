# D10 · Companies and work

**Acceptance test (GDD):** working twice on the same day is rejected, and the wage collected is the gross
minus 12 %.

## Design

- **Goods** (`game.goods`): wheat, iron and oil (raw) and ration, weapons Q1–Q5 and fuel (products), with
  the brief's recipes: ration 1 wheat + 2 points, weapon Q = Q iron + Q points, fuel 1 oil + 0.5 points.
- **Companies** belong to a citizen, produce one good in a region their country owns, and have a level
  (10, 20 or 40 employees), a wage, open vacancies, a cash account in the country's Credit (a new ledger
  account kind), a stock and the work points not yet turned into products. Founding costs 20 Gold (brief),
  upgrading 30 and 60, raising a weapon's quality 20 × Q; that Gold leaves the game (sink).
- **Work:** once per game day, 10 energy, 10 points for the company. An employee is paid the wage from the
  company's cash and pays the work tax to the treasury in the same transaction; without cash, nobody
  works. Owners may work in their own company without a wage. Raw companies turn each point into 1 unit ×
  the region's yield (50 % until deposits arrive in D22); product companies make what their points and
  inputs allow and keep the remaining points.
- **Jobs:** offers are the companies with open vacancies in the player's country; changing job waits
  24 hours. **Country policies** (`game.country_policies`): work tax 12 %, VAT 5 %, tariff 10 %, no minimum
  wage, changed by laws in D21.
- **Screens:** Economy in the bar. `/work` (Work canvas): job, payslip, working, offers and how production
  works. `/companies` and `/companies/new` (Company and FoundCompany canvases): found, manage cash, wage
  and vacancies, employees, stock and upgrades.

## Tests

- pgTAP (`090_companies.test.sql`): acceptance, founding and its Gold, upgrades, cash in and out, offers and
  job changes, owners working, production of raw goods and products with inputs, company without cash,
  permissions of other players, visitors locked out.
- Vitest: the work page (payslip, working, offers, errors) and the company pages, in both languages.
- Playwright: a player founds a company, funds it, hires another who works and gets paid net of tax.
