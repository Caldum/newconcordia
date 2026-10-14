/** Where the browser keeps who invited the visitor until their citizen exists. */
const storageKey = 'concordia.referrer';

/** «?ref=Camila%20Ríos» → «Camila Ríos»; null without a plausible citizen name. */
export function referrerFromSearch(search: string): string | null {
  const name = new URLSearchParams(search).get('ref')?.trim() ?? '';
  return name.length >= 3 && name.length <= 40 ? name : null;
}

export function rememberReferrer(name: string): void {
  try {
    localStorage.setItem(storageKey, name);
  } catch {
    // Private windows may refuse storage: the invitation is simply not recorded.
  }
}

/** The stored referrer, removed as it is read so it is claimed once. */
export function takeReferrer(): string | null {
  try {
    const name = localStorage.getItem(storageKey);
    localStorage.removeItem(storageKey);
    return name;
  } catch {
    return null;
  }
}

/** The invitation a player shares: the sign-up with their name. */
export function referralLink(origin: string, name: string): string {
  return `${origin}/sign-up?ref=${encodeURIComponent(name)}`;
}
