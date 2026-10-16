# 0048 · The market square: buying where you are, a ticket, figures for the government

Date: 2026-11-09 · Status: Accepted

## Context

The owner asked for the market to look like their reference «Plaza del mercado», within Atlas's grid and palette,
with these rules:

- A figures bar (volume of the last 24 hours, average ticket, active offers) that only the president and the
  minister of the economy see.
- Players see the market of the country they are in; to see another one they travel.
- No search box.
- Filters start on Food and Q1; there is no «all qualities».
- As the player picks quantities, a ticket builds up and buys several goods from several sellers at once.

Until now the market showed the player's own country (or a licensed one, ADR 0022) and bought from one offer at a
time.

## Decisions

1. **You buy where you are.** The market shown is that of the owner of the region the player is in
   (`game.location_country`). `public.buy` requires being there (`not_in_market_country`), and being there is
   enough: a license is no longer needed to buy. Licenses keep their other use, selling in another country's
   market from afar. A citizen abroad does not buy in their own country's market until they return.
2. **The ticket.** `public.buy_ticket(lines, key, company)` buys up to `market_ticket_lines_max` (20) offers in one
   transaction, every line or none. Each line is an ordinary `buy` with a key derived from the ticket's, so a retry
   charges nothing twice. Lines repeating an offer are added up, and lines run book by book in a fixed order, so
   two tickets never wait on each other in a cycle.
3. **The figures.** `public.market_stats(country)` refuses (`not_allowed`) anyone who is not that country's
   president or minister of the economy. It reports:
   - the volume (amounts paid, tariffs included) and the average ticket (per purchase line) of the last 24 hours,
     each against the 24 hours before;
   - the active offers, and the offers posted today.

   The page only asks for it when the player holds one of those offices in the market's country.
4. **The screen.** The head has an eyebrow, the title «Plaza del mercado» and «Publicar oferta». Below it:
   - the figures, for the government only;
   - a filter bar: a category (Food, Weapons, Medical kits, and Raw materials, which companies need), then a
     quality Q1–Q5, or which raw material;
   - the offers, with the count and the sort order (lowest price, highest price, largest quantity);
   - the ticket beside them.

   Each row has the product with its quality, the seller with their country, the units, the price and a − / +
   field that sets how many go to the ticket. The ticket shows each line (good, quantity × price, seller, amount),
   the subtotal, the VAT inside it, the tariff on imports, the total and where the goods go.

## Consequences

- A market license no longer opens buying; its terms page still describes selling.
- The reference's search box, «Todos» and «Todas» filters, grid view toggle and «Filtros» counter are left out on
  purpose.
- Rollback: header of `20261109090000_market_square.sql`.
