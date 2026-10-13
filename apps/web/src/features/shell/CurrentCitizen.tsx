import { createContext, use } from 'react';

import type { Citizen } from '../auth/useCitizen';

/** The signed-in player's citizen, provided by the game layout once it has loaded. */
export const CurrentCitizenContext = createContext<Citizen | null>(null);

/** The citizen of the signed-in player; only inside the game layout. */
export function useCurrentCitizen(): Citizen {
  const citizen = use(CurrentCitizenContext);
  if (!citizen) throw new Error('useCurrentCitizen must be used inside the game layout');
  return citizen;
}
