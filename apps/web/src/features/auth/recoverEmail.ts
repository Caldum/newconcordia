/** The address a recovery link was sent to, kept for this tab so the next screen can name it. */
const recoverEmailKey = 'concordia.recover.email';

export function saveRecoverEmail(email: string): void {
  try {
    sessionStorage.setItem(recoverEmailKey, email);
  } catch {
    // The sent screen then shows a generic text.
  }
}

export function readRecoverEmail(): string | null {
  try {
    return sessionStorage.getItem(recoverEmailKey);
  } catch {
    return null;
  }
}
