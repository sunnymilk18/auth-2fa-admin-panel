// Pantalla de carga de página completa (mientras se comprueba la sesión).
// Es idéntica al marcador que `index.html` dibuja antes de que cargue el
// JavaScript — mismas clases, estilos en el <style> de ese archivo —, así que
// al pasar de uno a otro no hay salto ni parpadeo.
//
// Las animaciones del marcador de index.html ya venían corriendo; este elemento
// es nuevo y las reiniciaría (el candado volvería a aparecer desde cero). Por eso
// se adelantan sus retardos con el tiempo que lleva la página cargando.
export function LoadingScreen() {
  const elapsed = performance.now() / 1000;
  const lockDelay = `${(0.15 - elapsed).toFixed(2)}s, ${(0.6 - elapsed).toFixed(2)}s`;
  const textDelay = `${(1.2 - elapsed).toFixed(2)}s`;
  return (
    <div className="splash" role="status" aria-live="polite">
      <svg className="splash-lock" style={{ animationDelay: lockDelay }} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M22 29V22a10 10 0 0 1 20 0v7" fill="none" stroke="#4fb8ae" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="15" y="29" width="34" height="23" rx="5" fill="#1b1f27" stroke="#4fb8ae" strokeWidth="4" />
        <circle cx="32" cy="39.5" r="3" fill="#4fb8ae" />
        <path d="M32 42v5" stroke="#4fb8ae" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="splash-text" style={{ animationDelay: textDelay }}>
        Cargando…
      </p>
    </div>
  );
}
