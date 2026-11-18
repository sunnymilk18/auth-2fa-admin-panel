import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './ToastProvider';

function Trigger({ message = 'Listo.', options }) {
  const { notify } = useToast();
  return (
    <button type="button" onClick={() => notify(message, options)}>
      Avisar
    </button>
  );
}

function setup(props) {
  render(
    <ToastProvider>
      <Trigger {...props} />
    </ToastProvider>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('un aviso simple desaparece a los 3,5 segundos', async () => {
    setup({});
    await userEvent.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(screen.getByText('Listo.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3600));
    expect(screen.queryByText('Listo.')).not.toBeInTheDocument();
  });

  it('un aviso con acción dura más y muestra su botón', async () => {
    setup({ message: '"ana@x.cl" baneado.', options: { action: { label: 'Deshacer', onClick: vi.fn() } } });
    await userEvent.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('"ana@x.cl" baneado.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByText('"ana@x.cl" baneado.')).not.toBeInTheDocument();
  });

  it('pulsar la acción corre su función y cierra el aviso', async () => {
    const onClick = vi.fn();
    setup({ options: { action: { label: 'Deshacer', onClick } } });
    await userEvent.click(screen.getByRole('button', { name: 'Avisar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
  });

  it('mientras el cursor está sobre el aviso, no se cierra', async () => {
    setup({ options: { action: { label: 'Deshacer', onClick: vi.fn() } } });
    await userEvent.click(screen.getByRole('button', { name: 'Avisar' }));
    await userEvent.hover(screen.getByRole('button', { name: 'Deshacer' }));
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
    await userEvent.unhover(screen.getByRole('button', { name: 'Deshacer' }));
    act(() => vi.advanceTimersByTime(4100));
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
  });
});
