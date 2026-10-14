/** A party name as the database accepts it: trimmed, 3 to 40 characters; null otherwise. */
export function partyName(text: string): string | null {
  const name = text.trim();
  return name.length >= 3 && name.length <= 40 ? name : null;
}

/** The longest description a party may have. */
export const partyDescriptionMax = 160;
