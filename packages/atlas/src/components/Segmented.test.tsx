import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Segmented, Switch } from './Segmented';

type Layer = 'countries' | 'battles' | 'resources';

function Layers() {
  const [layer, setLayer] = useState<Layer>('countries');
  return (
    <>
      <Segmented
        label="Capa"
        value={layer}
        onChange={setLayer}
        segments={[
          { value: 'countries', label: 'Países', controls: 'panel' },
          { value: 'battles', label: 'Batallas' },
          { value: 'resources', label: 'Recursos' },
        ]}
      />
      <div id="panel">{layer}</div>
    </>
  );
}

describe('Segmented', () => {
  it('is a tab list with one tab stop that follows the arrows', async () => {
    const { container } = render(<Layers />);
    expect(screen.getByRole('tablist', { name: 'Capa' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Países' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Países' })).toHaveAttribute('aria-controls', 'panel');

    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Batallas' })).toHaveFocus();
    expect(screen.getByText('battles')).toBeInTheDocument();

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Recursos' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(screen.getByRole('tab', { name: 'Países' }));
    expect(screen.getByText('countries')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});

describe('Switch', () => {
  function Setting() {
    const [on, setOn] = useState(true);
    return <Switch label="Avisos de batallas" checked={on} onChange={setOn} />;
  }

  it('toggles with its accessible name and state', async () => {
    const { container } = render(<Setting />);
    const toggle = screen.getByRole('switch', { name: 'Avisos de batallas' });
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    await expectNoAxeViolations(container);
  });
});
