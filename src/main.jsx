import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── Reprise auto après un nouveau déploiement ──────────────────────────────
// Un onglet ouvert avec une ANCIENNE version peut, en chargeant un module à la
// demande (jsPDF, html2canvas, une page…), demander un fichier qui n'existe
// plus (le nouveau build a renommé les fichiers) → « Failed to fetch
// dynamically imported module ». Vite émet alors l'évènement vite:preloadError.
// On recharge la page UNE fois pour récupérer la version à jour (garde 15 s
// anti-boucle). Fini la facture impossible à partager après une mise à jour.
const _chunkReload = () => {
  try {
    const KEY = 'jpd_chunk_reload_at';
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last > 15000) {
      localStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  } catch { window.location.reload(); }
};
window.addEventListener('vite:preloadError', _chunkReload);
// Filet de sécurité : certains navigateurs ne passent pas par vite:preloadError.
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e?.reason?.message || e?.reason || '');
  if (/dynamically imported module|importing a module script failed|Failed to fetch.*\.js/i.test(msg)) _chunkReload();
});

// ── Blocage du zoom sur TOUT le site (renfort pour Safari iOS qui ignore
//    user-scalable=no du meta viewport) ───────────────────────────────────
// 1. Pinch-to-zoom (gestes 2 doigts)
;['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
});
// 2. Double-tap zoom
let lastTouch = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouch <= 300) e.preventDefault();
  lastTouch = now;
}, { passive: false });
// 3. Pinch via touchmove (2 doigts)
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
// 4. Ctrl+molette (desktop)
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
