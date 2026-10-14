import type { ReactNode } from 'react';

import { AcceptLegalPanel } from './AcceptLegalPanel';
import { useLegalStatus } from './queries';

/**
 * The game once the player accepted the terms and the privacy policy in force; the acceptance first otherwise.
 * While the status loads, or if it cannot be read, the game shows: the database keeps every acceptance.
 */
export function LegalGate({ children }: { children: ReactNode }) {
  const status = useLegalStatus();
  const pending = status.data?.filter((document) => !document.accepted) ?? [];
  if (status.data && pending.length > 0) return <AcceptLegalPanel status={status.data} />;
  return children;
}
