import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
  it('empieza oculta y el ojo la muestra y la vuelve a ocultar', async () => {
    render(<PasswordField label="Contraseña" defaultValue="secreta" />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('el nombre accesible del campo es solo su etiqueta', () => {
    render(<PasswordField label="Contraseña" />);
    // Si el botón formara parte de la etiqueta, buscar por el texto exacto fallaría.
    expect(screen.getByLabelText('Contraseña', { exact: true })).toBeInTheDocument();
  });

  it('usa el sustantivo indicado en el botón', () => {
    render(<PasswordField label="Tu PIN" noun="PIN" />);
    expect(screen.getByRole('button', { name: 'Mostrar PIN' })).toBeInTheDocument();
  });
});
