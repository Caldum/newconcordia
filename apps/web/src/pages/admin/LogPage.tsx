import { AdminOnly } from '../../features/admin/AdminOnly';
import { useCurrentStaff } from '../../features/admin/CurrentStaff';
import { useAdminCountries } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import { AdminLogSection } from './AdminLogSection';
import { ConsolePage } from './ConsolePage';
import { messages } from './messages';

/** `/admin/log`: every staff action, append-only. */
export function LogPage() {
  const copy = useMessages(messages);
  const staff = useCurrentStaff();
  const countries = useAdminCountries(staff.role === 'admin');
  return (
    <ConsolePage title={copy.logPageTitle} intro={copy.logIntro}>
      <AdminOnly>
        <AdminLogSection countries={countries.data ?? []} />
      </AdminOnly>
    </ConsolePage>
  );
}
