import { Component } from 'react';

// Red de seguridad: si un componente falla al dibujarse, React desmonta todo y
// la página queda en blanco. Aquí se muestra en su lugar un aviso con una salida.
// Va por encima de los proveedores (sesión, avisos), así que no usa ninguno.
export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Error al mostrar la pantalla:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="login-shell">
        <div className="login-card" role="alert">
          <h1>Algo salió mal</h1>
          <p className="subtitle">
            Ocurrió un error inesperado al mostrar esta pantalla. Recarga la página; si se repite, avisa a quien
            administra el panel.
          </p>
          <button type="button" className="btn btn--primary" onClick={() => window.location.assign('/')}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }
}
