import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Base de todos los diálogos del panel. Pone en un solo lugar lo que un diálogo
// accesible necesita, para que no varíe de uno a otro:
//  - Escape cierra (salvo mientras `busy`: una acción en curso no se cierra a medias).
//  - Tab y Mayús+Tab dan la vuelta dentro del diálogo, sin salir a la página de atrás.
//  - Al abrir, el foco va al elemento con `data-autofocus` (o al campo con `autoFocus`,
//    o al primer elemento enfocable); al cerrar, vuelve a lo que lo abrió.
//  - El fondo de la página no se desplaza mientras está abierto.
//  - Un clic en el fondo oscuro cierra, pero solo si el clic empezó allí (arrastrar
//    desde dentro del diálogo hasta fuera no lo cierra por accidente).
// `as`: etiqueta del diálogo (p. ej. "form" para que el envío funcione con Enter).
export function Modal({
  as: Tag = 'div',
  role = 'dialog',
  labelledBy,
  describedBy,
  busy = false,
  onClose,
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null);
  const downOnOverlay = useRef(false);
  // Qué tenía el foco al abrir. Se lee durante el primer render, antes del montaje:
  // si un campo tiene `autoFocus`, React lo enfoca al montar y, leído en un efecto,
  // el "origen" sería ese campo en vez del botón que abrió el diálogo.
  const opener = useRef(undefined);
  if (opener.current === undefined) opener.current = document.activeElement;
  // onClose y busy cambian en cada render del padre; el efecto lee siempre el último.
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };

  useEffect(() => {
    const dialog = ref.current;

    // Foco inicial: lo que ya enfocó un `autoFocus` se respeta; si no, data-autofocus; si no, el primero.
    if (!dialog.contains(document.activeElement)) {
      const target = dialog.querySelector('[data-autofocus]') || dialog.querySelector(FOCUSABLE) || dialog;
      if (target === dialog) dialog.tabIndex = -1;
      target.focus();
    }

    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`; // que la página no dé un salto

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (!latest.current.busy) {
          e.preventDefault();
          latest.current.onClose();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      // Devuelve el foco a lo que abrió el diálogo, si sigue en la página.
      const back = opener.current;
      if (back && back.isConnected && typeof back.focus === 'function') back.focus();
    };
  }, []);

  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={(e) => {
        downOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnOverlay.current && !busy) onClose();
      }}
    >
      <Tag
        ref={ref}
        className={`dialog ${className}`.trim()}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </Tag>
    </div>
  );
}
