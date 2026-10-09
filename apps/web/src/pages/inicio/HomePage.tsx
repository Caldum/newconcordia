import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

export function HomePage() {
  useDocumentTitle(messages.documentTitle);

  return (
    <main>
      <h1>{messages.title}</h1>
      <p>{messages.body}</p>
    </main>
  );
}
