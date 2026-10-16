import { AdminOnly } from '../../features/admin/AdminOnly';
import { useMessages } from '../../i18n';

import { AbuseSection } from './AbuseSection';
import { CompensationSection } from './CompensationSection';
import { ConsolePage } from './ConsolePage';
import { EconomySection } from './EconomySection';
import { messages } from './messages';

/** `/admin/economy`: money per day, abuse signals and compensating entries. */
export function EconomyPage() {
  const copy = useMessages(messages);
  return (
    <ConsolePage title={copy.economyTitle} intro={copy.economyIntro}>
      <AdminOnly>
        <EconomySection />
        <AbuseSection />
        <CompensationSection />
      </AdminOnly>
    </ConsolePage>
  );
}
