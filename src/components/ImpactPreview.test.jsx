import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';
import { ImpactPreview } from './ImpactPreview';
import { IMPACTS, impactFor } from '../utils/impact';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ hasPin: true, refreshIdentity: vi.fn() }),
}));

describe('ImpactPreview', () => {
  it('no dibuja nada sin vista previa', () => {
    const { container } = render(<ImpactPreview impact={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra qué cambia, qué no cambia y si se puede deshacer', () => {
    render(<ImpactPreview impact={IMPACTS.banUser} />);
    expect(screen.getByText('Qué cambia')).toBeInTheDocument();
    expect(screen.getByText('La cuenta queda inactiva y no puede iniciar sesión.')).toBeInTheDocument();
    expect(screen.getByText('Qué no cambia')).toBeInTheDocument();
    expect(screen.getByText('Se puede deshacer.')).toBeInTheDocument();
    expect(screen.getByText(/no vuelven/)).toBeInTheDocument();
  });

  it('una acción sin vuelta atrás lo dice con todas las letras', () => {
    render(<ImpactPreview impact={IMPACTS.rotateClientKey} />);
    expect(screen.getByText('No se puede deshacer.')).toBeInTheDocument();
  });

  it('sin líneas de "qué no cambia" no pone ese título', () => {
    render(<ImpactPreview impact={IMPACTS.allowlistAdd} />);
    expect(screen.queryByText('Qué no cambia')).not.toBeInTheDocument();
    expect(screen.getByText('Se puede revertir a mano.')).toBeInTheDocument();
  });
});

describe('ConfirmDialog con vista previa', () => {
  const base = { open: true, title: 'Desactivar "Hospital"', message: 'Resumen.', confirmLabel: 'Desactivar', danger: true };

  it('la muestra en un diálogo sin PIN', () => {
    render(<ConfirmDialog {...base} impact={IMPACTS.revokeSessions} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Se cierran todas sus sesiones abiertas.')).toBeInTheDocument();
  });

  it('la muestra en un diálogo con PIN, sin quitarle el campo ni el foco inicial', () => {
    const impact = impactFor('deactivateClient', { extraChanges: ['Sus 120 usuarios dejan de poder iniciar sesión a través de este sistema.'] });
    render(<ConfirmDialog {...base} needsPin impact={impact} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Sus 120 usuarios/)).toBeInTheDocument();
    expect(screen.getByLabelText('Tu PIN')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeDisabled();
  });

  it('sin vista previa el diálogo queda como antes', () => {
    render(<ConfirmDialog {...base} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Qué cambia')).not.toBeInTheDocument();
  });

  it('confirmar sigue funcionando con la vista previa abierta', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...base} impact={IMPACTS.disableTotp} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
