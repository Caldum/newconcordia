import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../test/axe';

import { Button, buttonClassName } from './Button';

describe('Button', () => {
  it('is a non-submitting button by default and runs its action', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Entrar a combatir</Button>);
    const button = screen.getByRole('button', { name: 'Entrar a combatir' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies variant and size classes and keeps the icon decorative', () => {
    render(
      <Button variant="war" size="large" icon="swords">
        Entrar a combatir
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Entrar a combatir' });
    expect(button.className).toContain('war');
    expect(button.className).toContain('large');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('stays disabled and explains why in its text', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Ya trabajaste hoy
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Ya trabajaste hoy' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('exposes its classes for links that look like buttons', () => {
    expect(buttonClassName()).toContain('primary');
    expect(buttonClassName({ variant: 'ghost' })).toContain('ghost');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Button>Crear mi ciudadano</Button>
        <Button variant="secondary" icon="back">
          Volver
        </Button>
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
