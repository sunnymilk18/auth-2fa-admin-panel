import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let nextID = 0;

const DEFAULT_MS = 3500;
// Un aviso con acción ("Deshacer") dura más: hay que darle tiempo a quien lo lee.
const ACTION_MS = 10000;
// Al apartar el cursor o el foco, el aviso se queda un rato más.
const RESUME_MS = 4000;

// Notificaciones flotantes, siempre en la misma esquina — a diferencia de
// resaltar una fila, esto se ve pase lo que pase con el scroll o cuántas
// filas haya en la tabla.
//
// `notify(mensaje, { type, action, duration })`: `action` es `{ label, onClick }` y agrega un
// botón al aviso (p. ej. "Deshacer" tras banear). Pulsarlo cierra el aviso y corre `onClick`.
// Mientras el cursor o el foco estén sobre el aviso, no se cierra.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const schedule = useCallback(
    (id, ms) => {
      clearTimeout(timers.current.get(id));
      timers.current.set(id, setTimeout(() => dismiss(id), ms));
    },
    [dismiss]
  );

  const hold = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message, { type = 'success', action, duration } = {}) => {
      const id = nextID++;
      setToasts((current) => [...current, { id, message, type, action }]);
      schedule(id, duration ?? (action ? ACTION_MS : DEFAULT_MS));
    },
    [schedule]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.type}${t.action ? ' toast--with-action' : ''}`}
            onMouseEnter={() => hold(t.id)}
            onMouseLeave={() => schedule(t.id, RESUME_MS)}
            onFocus={() => hold(t.id)}
            onBlur={() => schedule(t.id, RESUME_MS)}
          >
            <span className="toast-message">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  dismiss(t.id);
                  t.action.onClick();
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
