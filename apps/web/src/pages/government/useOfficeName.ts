import type { MyOffice } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The name of a national office in the player's language. */
export function useOfficeName(): (office: MyOffice['office']) => string {
  const copy = useMessages(messages);
  return (office) => copy[`office_${office}`];
}
