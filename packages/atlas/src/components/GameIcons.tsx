/** The colored icons of Atlas: the Gold coin, the Credit bill and the energy bolt. Decorative: a number follows. */
export function GoldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="var(--gold)" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="var(--gold-border)" strokeWidth="1.8" />
    </svg>
  );
}

/** The Credit bill, in the player's country color (NavBar canvas). */
export function CreditIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" fill="var(--nation-deep)" />
      <circle cx="12" cy="12" r="3" fill="var(--land)" />
    </svg>
  );
}

export function EnergyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        d="M13 2.5 4.5 13.5H11L10 21.5l8.5-11H12l1-8z"
        fill="var(--energy)"
        stroke="#B98500"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
