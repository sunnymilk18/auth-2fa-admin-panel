import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ hasPin: true, refreshIdentity: vi.fn() }),
}));

const base = { open: true, title: 'Desactivar cliente', message: '¿Seguro?', confirmLabel: 'Desactivar' };

describe('ConfirmDialog sin PIN', () => {
  it('no dibuja nada si está cerrado', () => {
    render(<ConfirmDialog {...base} open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('en una acción destructiva el foco empieza en "Cancelar"', () => {
    render(<ConfirmDialog {...base} danger onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('confirma y cancela con sus botones', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...base} onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape cancela', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...base} onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ConfirmDialog con PIN', () => {
  it('no deja confirmar hasta tener los seis dígitos y solo acepta números', async () => {
    render(<ConfirmDialog {...base} needsPin onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const confirm = screen.getByRole('button', { name: 'Desactivar' });
    const field = screen.getByLabelText('Tu PIN');
    expect(field).toHaveFocus();
    expect(confirm).toBeDisabled();

    await userEvent.type(field, '12ab345');
    expect(field).toHaveValue('12345');
    expect(confirm).toBeDisabled();

    await userEvent.type(field, '6');
    expect(confirm).toBeEnabled();
  });

  it('entrega el PIN escrito a onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue();
    render(<ConfirmDialog {...base} needsPin onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Tu PIN'), '399509');
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(onConfirm).toHaveBeenCalledWith('399509');
  });

  it('si el PIN es incorrecto, el cuadro sigue abierto, lo explica y limpia el campo', async () => {
    const onConfirm = vi.fn().mockRejectedValue({ data: { code: 'pin_invalid' } });
    render(<ConfirmDialog {...base} needsPin onConfirm={onConfirm} onCancel={vi.fn()} />);
    const field = screen.getByLabelText('Tu PIN');
    await userEvent.type(field, '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El PIN no es correcto.');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(field).toHaveValue('');
  });
});
