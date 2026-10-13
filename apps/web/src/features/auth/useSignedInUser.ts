import { useAuth } from './AuthProvider';

/** The signed-in user's id (empty when signed out) and whether their queries may run. */
export function useSignedInUser() {
  const auth = useAuth();
  return {
    userId: auth.status === 'signedIn' ? auth.session.user.id : '',
    enabled: auth.status === 'signedIn',
  };
}
