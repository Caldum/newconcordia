import type { ReactNode } from 'react';

interface StoryProps {
  title: string;
  children?: ReactNode;
}

/** The headline on the dark side of the account screens. */
export function Story({ title, children }: StoryProps) {
  return (
    <>
      <h2 className="at-display">{title}</h2>
      {children ? <p>{children}</p> : null}
    </>
  );
}
