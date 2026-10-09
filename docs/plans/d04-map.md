# D04 · Game map

**Acceptance test (GDD):** changing the owner of a region in the database changes its color on the map
after reloading.

## Design

- **Data:** `useWorld()` reads `public.list_countries()` and `public.list_regions()` in parallel through a
  typed Supabase client (TanStack Query, responses validated with zod). The owner decides the color; the
  geometry never carries game state.
- **Geometry:** `data/map/world-regions.json` is imported as a URL, so Vite emits it with a content hash
  under `/assets/` (immutable cache) and the map loads it only on the map route (code split).
- **Rendering:** SVG with d3-geo (equirectangular from −58° to 84°, as the landing prototype) and
  topojson-client for shapes and borders; d3-zoom for wheel, drag and pinch. Regions of countries not in
  play and disabled regions are gray and inert.
- **Accessibility:** the SVG is one labeled image; regions are not tab stops. A search box (combobox with a
  listbox) selects countries and regions by name, zoom buttons replace gestures, and the side panel
  describes the selection (owner, home country, provinces) in an `aria-live` region.
- **Environment:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` validated at startup. The CSP
  `connect-src` is written at build time with the exact Supabase origin instead of a wildcard.
- **E2E:** CI starts local Supabase for the journeys job; the acceptance test changes an owner with SQL
  and checks the region's fill after reload.
