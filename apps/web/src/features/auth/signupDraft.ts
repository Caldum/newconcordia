import { z } from 'zod';

const draftKey = 'concordia.signup';

const draftSchema = z.object({
  email: z.string(),
  citizenName: z.string(),
  countryCode: z.string().nullable(),
  /** A country not in play the player waits for (D06). */
  waitlistCountryCode: z.string().nullable().default(null),
  /**
   * Random value sent with the sign-up. Signing up again from this browser with the same key takes back
   * the name the first attempt reserved, so a mistyped email can be fixed without losing the name.
   */
  signupKey: z.string().min(32),
});

/** What the player typed at sign-up, minus the password. Lives in this tab only. */
export type SignupDraft = z.infer<typeof draftSchema>;

export function newSignupKey(): string {
  return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
}

export function readSignupDraft(): SignupDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey);
    if (!raw) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveSignupDraft(draft: SignupDraft): void {
  try {
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
  } catch {
    // Without storage the verification screen falls back to a generic text.
  }
}

export function clearSignupDraft(): void {
  try {
    sessionStorage.removeItem(draftKey);
  } catch {
    // Nothing to clear.
  }
}
