import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

function Host() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      {open && (
        <Modal labelledBy="t" onClose={() => setOpen(false)}>
          <h3 id="t">Diálogo</h3>
          <button>Primero</button>
          <button>Último</button>
        </Modal>
      )}
    </>
  );
}

describe('Modal', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Escape lo cierra y el foco vuelve al botón que lo abrió', async () => {
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('Tab da la vuelta dentro del diálogo, en los dos sentidos', async () => {
    // jsdom no calcula el diseño y getClientRects() siempre vuelve vacío; el Modal lo usa
    // para descartar los elementos ocultos, así que aquí todos cuentan como visibles.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}]);
    render(<Host />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const first = screen.getByRole('button', { name: 'Primero' });
    const last = screen.getByRole('button', { name: 'Último' });
    expect(first).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
    await userEvent.tab();
    expect(first).toHaveFocus();
  });

  it('bloquea el desplazamiento de la página mientras está abierto y lo devuelve al cerrar', async () => {
    render(<Host />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('no se cierra con Escape mientras hay una acción en curso', async () => {
    let closed = false;
    render(
      <Modal busy onClose={() => (closed = true)}>
        <button>Aceptar</button>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(closed).toBe(false);
  });
});
