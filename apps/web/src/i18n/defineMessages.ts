import type { Locale } from './locales';

type Message = string | ((...args: never[]) => string);

/** The English (or any other) catalog must mirror the Spanish one: same keys, same signatures. */
type TranslationOf<Source extends Record<string, Message>> = {
  readonly [Key in keyof Source]: Source[Key] extends (...args: infer Args) => string
    ? (...args: Args) => string
    : string;
};

/** Spanish is the source language: its catalog defines the keys and signatures. */
type SourceLocale = Extract<Locale, 'es'>;

export type Catalog<Source extends Record<string, Message>> = Readonly<
  Record<SourceLocale, Source> & Record<Exclude<Locale, SourceLocale>, TranslationOf<Source>>
>;

/**
 * Declares a screen's copy for every locale. Spanish is the source; a missing English key or a
 * message whose parameters differ is a type error.
 */
export function defineMessages<const Source extends Record<string, Message>>(catalog: {
  es: Source;
  en: NoInfer<TranslationOf<Source>>;
}): Catalog<Source> {
  return catalog;
}
