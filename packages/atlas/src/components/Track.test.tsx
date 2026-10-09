import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { EnergyMeter, ProgressMeter, SplitTrack } from './Track';

describe('SplitTrack', () => {
  it('writes both sides with their shares and sizes the segments', async () => {
    const { container } = render(
      <SplitTrack
        leftShare={0.58}
        left={{ name: 'Argentina', color: 'var(--country-arg)', valueText: '58 %' }}
        right={{ name: 'España', color: 'var(--country-esp)', valueText: '42 %' }}
      />,
    );
    expect(screen.getByText('Argentina 58 %')).toBeInTheDocument();
    expect(screen.getByText('42 % España')).toBeInTheDocument();
    const [leftSegment] = container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > span');
    expect(leftSegment?.style.width).toBe('58%');
    await expectNoAxeViolations(container);
  });

  it('clamps shares outside 0..1', () => {
    const { container } = render(
      <SplitTrack
        leftShare={1.4}
        left={{ name: 'A', color: 'red', valueText: '100 %' }}
        right={{ name: 'B', color: 'blue', valueText: '0 %' }}
      />,
    );
    expect(container.querySelector<HTMLElement>('[aria-hidden="true"] > span')?.style.width).toBe(
      '100%',
    );
  });
});

describe('meters', () => {
  it('exposes energy as a meter with a spoken value and the number visible', async () => {
    const { container } = render(
      <EnergyMeter value={84} max={100} label="Energía" valueText="84 de 100" />,
    );
    const meter = screen.getByRole('meter', { name: 'Energía' });
    expect(meter).toHaveAttribute('aria-valuenow', '84');
    expect(meter).toHaveAttribute('aria-valuetext', '84 de 100');
    expect(meter).toHaveTextContent('84');
    await expectNoAxeViolations(container);
  });

  it('labels progress meters and handles an empty maximum', async () => {
    const { container } = render(
      <div>
        <ProgressMeter value={6420} max={8000} label="Experiencia" valueText="6.420 de 8.000" />
        <ProgressMeter value={0} max={0} label="Cupo" valueText="Sin cupo" />
      </div>,
    );
    expect(screen.getByRole('meter', { name: 'Experiencia' })).toHaveAttribute(
      'aria-valuetext',
      '6.420 de 8.000',
    );
    const bars = container.querySelectorAll<HTMLElement>('[role="meter"] > span');
    expect(bars[0]?.style.width).toBe('80.3%');
    expect(bars[1]?.style.width).toBe('0%');
    await expectNoAxeViolations(container);
  });
});
