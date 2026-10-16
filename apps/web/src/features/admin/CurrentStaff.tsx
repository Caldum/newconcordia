import { createContext, use } from 'react';

import type { Staff } from './queries';

export const CurrentStaffContext = createContext<Staff | null>(null);

/** The signed-in staff member, inside the console layout (StaffOnly provides it). */
export function useCurrentStaff(): Staff {
  const staff = use(CurrentStaffContext);
  if (!staff) throw new Error('useCurrentStaff outside the admin console');
  return staff;
}
