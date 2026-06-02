import React from 'react';

/**
 * Bouton "Rafraîchir" réutilisable (recharge la page).
 * - variant="light"  → fond clair (en-têtes blancs, ex: vitrine)
 * - variant="dark"   → fond sombre (landing, console marchand/admin)
 */
export default function RefreshButton({ variant = 'light', className = '' }) {
  const styles = variant === 'dark'
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-600';
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      aria-label="Rafraîchir"
      title="Rafraîchir la page"
      className={`p-2.5 rounded-full transition-all shadow-sm cursor-pointer hover:scale-105 active:rotate-180 duration-300 ${styles} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}
