import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let nextID = 0;

// Notificaciones flotantes, siempre en la misma esquina — a diferencia de
// resaltar una fila, esto se ve pase lo que pase con el scroll o cuántas
// filas haya en la tabla.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, { type = 'success' } = {}) => {
    const id = nextID++;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.message}
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
