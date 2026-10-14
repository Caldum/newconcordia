import { useLegalVersions } from '../../features/legal/queries';
import { useLocale, useMessages } from '../../i18n';

import { LegalDocument } from './LegalDocument';
import { legalSections, messages } from './messages';

/** `/terms`: the terms and conditions in force. */
export function TermsPage() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const versions = useLegalVersions().data;
  return (
    <LegalDocument
      title={copy.termsTitle}
      version={versions?.terms_version}
      sections={legalSections[locale].terms}
    />
  );
}
