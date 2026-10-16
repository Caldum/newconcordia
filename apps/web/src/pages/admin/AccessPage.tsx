import { AdminOnly } from '../../features/admin/AdminOnly';
import { useMessages } from '../../i18n';

import { AdminTeamSection } from './AdminTeamSection';
import { BetaSection } from './BetaSection';
import { ConsolePage } from './ConsolePage';
import { messages } from './messages';

/** `/admin/access`: the closed beta and the team. */
export function AccessPage() {
  const copy = useMessages(messages);
  return (
    <ConsolePage title={copy.accessTitle} intro={copy.accessIntro}>
      <AdminOnly>
        <AdminTeamSection />
        <BetaSection />
      </AdminOnly>
    </ConsolePage>
  );
}
