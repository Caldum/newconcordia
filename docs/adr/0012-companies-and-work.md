# 0012 · Companies and work: production, cash, jobs and policies

Date: 2026-10-09 · Status: Accepted

## Context

D10 asks for companies paid in Gold, job offers, one workday per day with a wage, and the work tax. The
sources disagree on numbers: the GDD prices a factory at 40 Gold and gives iron and oil 5 and 4 units per
workday; the brief says founding costs 20 Gold; the FoundCompany canvas computes every raw material as
10 points × the region's yield. Deposits (yield above 50 %) arrive in D22 and laws that change taxes in D21.

## Decisions

1. **Founding any company costs 20 Gold** (brief). Upgrades and weapon quality keep the GDD prices
   (30, 60 and 20 × Q). That Gold goes to the Gold sink: it leaves the game, as the GDD's list of sinks says.
2. **A workday is 10 points.** Raw materials make 1 unit per point × the region's yield (canvas); products
   follow the brief's recipes. Product companies keep the points that lack inputs and use them when the
   inputs arrive, so a day without wheat is not lost.
3. **A company's cash is a ledger account** (new kind `company`) in its country's Credit. The wage and the
   work tax are two postings of one transaction: if the cash is short, the workday is refused and nothing
   moves, energy included.
4. **Owners may work in their own company** once a day without a wage; the production is theirs.
5. **Country policies** (`game.country_policies`) hold the work tax (12 %), VAT (5 %), tariff (10 %) and
   minimum wage (none), within the GDD's legal ranges. Laws change them from D21.
6. **One job change per 24 hours**, counted from the last hiring (Work canvas). Streaks count consecutive
   workdays in the same company.
7. **Yield is a function** (`game.raw_yield`) that returns 50 % everywhere until D22 adds deposit levels.

## Consequences

- The market (D11) sells from company stock and charges the policies' VAT and tariff.
- Partnerships and the «Vender producción» and «Pasar a mi inventario» actions of the Company canvas wait
  for D11, D12 and D23.
