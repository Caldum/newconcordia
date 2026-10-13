import { useCallback, useState } from 'react';

/**
 * One idempotency key per intended action: retrying after a failure reuses it, so the database never
 * applies it twice; `renew` starts a new one after success or when the request changes.
 */
export function useActionKey(): [string, () => void] {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const renew = useCallback(() => {
    setKey(crypto.randomUUID());
  }, []);
  return [key, renew];
}
