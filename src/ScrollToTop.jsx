import { useEffect, useState } from 'react';

/**
 * Bouton flottant « retour en haut » : apparaît quand on a défilé vers le bas,
 * remonte la page en douceur au clic. Monté une fois (dans App) → toutes les pages.
 * Placé en bas à GAUCHE pour ne pas gêner les boutons en bas à droite (WhatsApp, etc.).
 */
export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Retour en haut"
      title="Retour en haut"
      className="fixed left-5 bottom-6 z-40 w-11 h-11 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all active:scale-90 animate-fade-up"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
