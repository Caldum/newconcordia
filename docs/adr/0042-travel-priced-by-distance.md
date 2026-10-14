# 0042 · Travel priced by distance

Date: 2026-11-03 · Status: Accepted

## Context

Travel between regions shipped off because its price and duration were pending (PD-03, ADR 0035). On 2026-11-03 the
owner decided them: the real distance in kilometres, at 0.0001 GOLD per kilometre, charged in the national currency at
the average GOLD price of the country's market over the last 6 hours, with 1 GOLD = 500 units of currency while
there is no such average; and the trip is instant. The owner also asked to keep where each character is.

## Decisions

1. **Where a citizen is** stays in `citizens.region_code` (it was already the presence used by battles and
   hospitals). The side panel, the profile and the battles show it.
2. **Distance** is the great-circle distance between the regions' centroids (mean Earth radius 6371 km). The
   centroids come from the map (`data/map/scripts/region_centroids.mjs`): planar and area-weighted over every ring,
   because the shapes mix islands and mainland in rings of either winding.
3. **Rate**: volume-weighted average of the trades of the traveller's currency against GOLD in the last 6 hours;
   500 when there were none. The parameters are `travel_gold_per_km`, `travel_rate_hours` and
   `travel_fallback_rate`.
4. **Price**: kilometres × 0.0001 × rate, in hundredths of the currency rounded up. It is paid from the citizen's
   account in their own national currency, wherever they are, and burned (it leaves the game, as the GOLD travel
   price was meant to).
5. **Instant**; at zero health nobody travels (spec section 6). Every trip is recorded in `game.travel_events`; the
   idempotency key makes a retry the same trip.

## Consequences

- A `/travel` screen lists every enabled region, nearest first, with its distance and price.
- `get_travel_terms` changed its columns; the web reads the new ones in the same release.
- Rollback: header of `20261103090000_travel.sql`.
