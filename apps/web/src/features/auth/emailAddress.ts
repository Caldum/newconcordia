/** Something@somewhere.tld: enough to catch typos before the server checks it for real. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
