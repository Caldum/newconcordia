import { Link } from '@tanstack/react-router';

import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

export function NotFoundPage() {
  useDocumentTitle(messages.documentTitle);

  return (
    <main>
      <p>{messages.eyebrow}</p>
      <h1>{messages.title}</h1>
      <p>{messages.body}</p>
      <Link to="/">{messages.goHome}</Link>
    </main>
  );
}
