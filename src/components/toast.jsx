/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';

/**
 * Système de notifications "toast" global, sans contexte :
 *   import { toast } from '.../components/toast';
 *   toast('Message');                 // erreur (rouge) par défaut
 *   toast('Bravo !', 'success');      // succès (vert)
 *   toast('Info', 'info');            // neutre
 * Et monter <Toaster /> une seule fois (dans App).
 */

let listeners = [];
let idCounter = 0;

export function toast(message, type = 'error', duration = 4000) {
  const t = { id: ++idCounter, message: String(message), type, duration };
  listeners.forEach(fn => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const add = (t) => {
      setToasts(prev => [...prev, t]);
      if (t.duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(x => x.id !== t.id));
        }, t.duration);
      }
    };
    listeners.push(add);
    return () => { listeners = listeners.filter(l => l !== add); };
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const styles = {
    success: 'bg-emerald-600 border-emerald-400/40',
    error: 'bg-red-600 border-red-400/40',
    info: 'bg-slate-800 border-slate-600',
  };
  const icons = { success: '✓', error: '!', info: 'i' };

  return (
    <div
      className="fixed z-[100] bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm flex flex-col gap-2 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-white shadow-2xl animate-fade-up ${styles[t.type] || styles.info}`}
        >
          <span className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
            {icons[t.type] || icons.info}
          </span>
          <p className="text-sm font-medium leading-snug whitespace-pre-line flex-1">{t.message}</p>
          <button
            onClick={() => remove(t.id)}
            aria-label="Fermer"
            className="shrink-0 text-white/70 hover:text-white text-lg leading-none -mt-0.5"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
