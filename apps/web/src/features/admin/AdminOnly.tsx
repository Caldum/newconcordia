import { Note } from '@concordia/atlas/Note';
import type { ReactNode } from 'react';

import { useMessages } from '../../i18n';

import { useCurrentStaff } from './CurrentStaff';
import { consoleMessages } from './messages';

/** A section for admins; moderators who reach it by its address read why it is closed. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const copy = useMessages(consoleMessages);
  const staff = useCurrentStaff();
  return staff.role === 'admin' ? children : <Note tone="info">{copy.adminOnly}</Note>;
}
