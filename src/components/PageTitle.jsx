import { useEffect, useRef } from 'react';

const APP_NAME = 'Panel de administración';

// Título de una sección. Además de mostrarse, pone el título de la pestaña del
// navegador y lleva el foco aquí al entrar: con el cambio de ruta no hay carga
// de página, así que sin esto un lector de pantalla no se entera de que cambió
// la sección y el foco se queda en un enlace del menú.
export function PageTitle({ children, className }) {
  const ref = useRef(null);

  useEffect(() => {
    document.title = `${children} · ${APP_NAME}`;
    ref.current?.focus({ preventScroll: true });
  }, [children]);

  return (
    <h1 ref={ref} tabIndex={-1} className={className}>
      {children}
    </h1>
  );
}
