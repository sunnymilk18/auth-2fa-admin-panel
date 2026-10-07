import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

const ITEM_HEIGHT = 36;
const MENU_PADDING = 14;
const DIVIDER_HEIGHT = 13;
const HEADER_HEIGHT = 44;

// Una línea separa el primer ítem de peligro del resto: marca dónde empiezan
// las acciones que debilitan o borran algo.
const startsDangerGroup = (item, i, all) => item.danger && i > 0 && !all[i - 1].danger;

// Menú de acciones de una fila. Se posiciona con `fixed` a partir del botón
// porque la tabla vive en un contenedor con scroll horizontal, que recortaría
// un menú `absolute` en las últimas filas. Se dibuja en el `body` (portal) y no
// dentro de la celda: la celda de acciones es `sticky`, crea su propio orden de
// apilamiento y las celdas de las filas siguientes taparían el menú.
// `title`: sobre qué actúa el menú (p. ej. el correo del usuario). `items`:
// [{ label, icon, onSelect, danger }].
export function ActionMenu({ label = 'Más acciones', title, items, disabled }) {
  const [pos, setPos] = useState(null); // { top, right } mientras está abierto
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const open = pos !== null;

  function close({ restoreFocus = false } = {}) {
    setPos(null);
    if (restoreFocus) buttonRef.current?.focus();
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight =
      items.length * ITEM_HEIGHT +
      items.filter(startsDangerGroup).length * DIVIDER_HEIGHT +
      (title ? HEADER_HEIGHT : 0) +
      MENU_PADDING;
    // Si no cabe debajo del botón, se abre hacia arriba.
    const fitsBelow = rect.bottom + 4 + menuHeight <= window.innerHeight;
    setPos({
      top: fitsBelow ? rect.bottom + 4 : Math.max(8, rect.top - 4 - menuHeight),
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();

    function onPointerDown(e) {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        close({ restoreFocus: true });
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const entries = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
      const next = entries.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
      entries[(next + entries.length) % entries.length].focus();
    }
    // Un menú fijo no acompaña al botón si la página se mueve: mejor cerrarlo.
    const onMove = () => close();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn--ghost btn--icon"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </button>
      {open &&
        createPortal(
        <div
          ref={menuRef}
          className="menu"
          role="menu"
          aria-label={title || label}
          style={{ top: pos.top, right: pos.right }}
        >
          {title && (
            <div className="menu-header mono" aria-hidden="true">
              {title}
            </div>
          )}
          {items.map((item, i) => (
            <Fragment key={item.label}>
              {startsDangerGroup(item, i, items) && <div className="menu-divider" role="separator" />}
              <button
                type="button"
                role="menuitem"
                className={`menu-item${item.danger ? ' menu-item--danger' : ''}`}
                // El foco sigue al cursor: así nunca hay dos opciones resaltadas a la vez.
                onMouseEnter={(e) => e.currentTarget.focus()}
                onClick={() => {
                  // El foco vuelve al botón antes de actuar: así un diálogo que se abra
                  // lo toma como su origen y se lo devuelve al cerrar.
                  close({ restoreFocus: true });
                  item.onSelect();
                }}
              >
                {item.icon && <Icon name={item.icon} className="menu-item-icon" />}
                <span>{item.label}</span>
              </button>
            </Fragment>
          ))}
        </div>,
          document.body
        )}
    </>
  );
}
