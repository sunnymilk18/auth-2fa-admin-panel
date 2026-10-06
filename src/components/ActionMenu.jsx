import { useEffect, useRef, useState } from 'react';

const ITEM_HEIGHT = 38;
const MENU_PADDING = 8;

// Menú de acciones de una fila. Se posiciona con `fixed` a partir del botón
// porque la tabla vive en un contenedor con scroll horizontal, que recortaría
// un menú `absolute` en las últimas filas. `items`: [{ label, onSelect, danger }].
export function ActionMenu({ label = 'Más acciones', items, disabled }) {
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
    const menuHeight = items.length * ITEM_HEIGHT + MENU_PADDING;
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
      {open && (
        <div ref={menuRef} className="menu" role="menu" style={{ top: pos.top, right: pos.right }}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`menu-item${item.danger ? ' menu-item--danger' : ''}`}
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
