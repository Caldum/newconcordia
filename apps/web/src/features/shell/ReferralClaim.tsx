import { useEffect } from 'react';

import { useGameAction } from '../actions/useGameAction';
import { setMyReferrer } from '../profile/api';
import { takeReferrer } from '../profile/referral';

/**
 * Records who invited the player, once, from the invitation they signed up with. Silent: a late or wrong
 * invitation is simply not recorded.
 */
export function ReferralClaim() {
  const { run } = useGameAction((_, name: string) => setMyReferrer(name));
  useEffect(() => {
    const name = takeReferrer();
    if (name) run(name);
  }, [run]);
  return null;
}
