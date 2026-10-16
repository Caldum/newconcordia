import { Outlet } from '@tanstack/react-router';

import { AdminShell } from './AdminShell';
import { StaffOnly } from './StaffOnly';

/** Layout route of every console screen: a staff account, inside the console's own bar (ADR 0049). */
export function AdminLayout() {
  return (
    <StaffOnly>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </StaffOnly>
  );
}
