import { useLegalVersions } from '../../features/legal/queries';
import { useLocale, useMessages } from '../../i18n';

import { LegalDocument } from './LegalDocument';
import { legalSections, messages } from './messages';

/** `/privacy`: the privacy policy in force. */
export function PrivacyPage() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const versions = useLegalVersions().data;
  return (
    <LegalDocument
      title={copy.privacyTitle}
      version={versions?.privacy_version}
      sections={legalSections[locale].privacy}
    />
  );
}
