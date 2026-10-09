import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs axe on a rendered fragment. Color contrast needs a real browser and is checked in the
 * gallery e2e; `region` does not apply to isolated components.
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const violations = results.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(' | ')}`,
  );
  expect(violations).toEqual([]);
}
