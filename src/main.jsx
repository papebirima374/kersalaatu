import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
