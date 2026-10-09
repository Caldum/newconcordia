import { use } from 'react';

import { LocaleContext } from './LocaleProvider';
import type { LocaleContextValue } from './LocaleProvider';
import type { Locale } from './locales';

export function useLocale(): LocaleContextValue {
  const context = use(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside <LocaleProvider>');
  return context;
}

/** Returns the active locale's messages from a screen catalog (see defineMessages). */
export function useMessages<C extends Readonly<Record<Locale, unknown>>>(catalog: C): C[Locale] {
  return catalog[useLocale().locale];
}
