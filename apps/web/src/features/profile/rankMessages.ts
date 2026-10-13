import { defineMessages } from '../../i18n';

import { withTier } from './rank';

/** Novice, then the 15 traditional ranks (spec section 6). */
const es = [
  'Novato',
  'Milicia',
  'Soldado',
  'Cabo',
  'Sargento',
  'Sargento Primero',
  'Suboficial',
  'Suboficial Mayor',
  'Subteniente',
  'Teniente',
  'Teniente Primero',
  'Capitán',
  'Mayor',
  'Teniente Coronel',
  'Coronel',
  'General',
];

const en = [
  'Novice',
  'Militia',
  'Soldier',
  'Corporal',
  'Sergeant',
  'First Sergeant',
  'Warrant Officer',
  'Chief Warrant Officer',
  'Second Lieutenant',
  'Lieutenant',
  'First Lieutenant',
  'Captain',
  'Major',
  'Lieutenant Colonel',
  'Colonel',
  'General',
];

/** Military rank names, shared by every screen that shows a rank. */
export const rankMessages = defineMessages({
  es: { rankName: (step: number) => withTier(es, step) },
  en: { rankName: (step: number) => withTier(en, step) },
});
