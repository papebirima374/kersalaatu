import React from 'react';

/**
 * Empêche les "pages blanches" : si un composant lève une erreur au rendu,
 * on affiche un écran de secours lisible (au lieu d'un crash silencieux de React)
 * avec le détail de l'erreur et un bouton pour recharger.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Visible dans la console du navigateur (et utile pour le debug en prod)
    console.error('💥 Erreur de rendu interceptée par ErrorBoundary:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{ background: '#0f172a' }}
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans"
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-3xl mb-4">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Une erreur est survenue</h2>
        <p className="text-slate-400 max-w-md mb-4">
          La page n'a pas pu s'afficher correctement. Vous pouvez recharger pour réessayer.
        </p>
        {this.state.error && (
          <pre className="max-w-md w-full overflow-auto text-left text-[11px] text-red-300 bg-red-950/30 border border-red-900/40 rounded-xl p-3 mb-6 whitespace-pre-wrap">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        )}
        <button
          onClick={this.handleReload}
          className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold transition-all"
        >
          Recharger la page
        </button>
      </div>
    );
  }
}
