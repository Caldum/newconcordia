import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

export function NotFoundPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);

  return (
    <main>
      <p>{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      <Link to="/">{copy.goHome}</Link>
    </main>
  );
}
