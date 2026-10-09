import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

export function HomePage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);

  return (
    <main>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
    </main>
  );
}
