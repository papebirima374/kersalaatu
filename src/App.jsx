import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import ErrorBoundary from './ErrorBoundary';
import { Toaster } from './components/toast';
import PullToRefresh from './PullToRefresh';
import ScrollToTop from './ScrollToTop';

// Après un déploiement, les fichiers de l'ancienne version n'existent plus :
// si un onglet resté ouvert tente de charger une page, l'import échoue
// (« Failed to fetch dynamically imported module »). On recharge alors la page
// UNE fois automatiquement pour récupérer la nouvelle version.
const lazyReload = (importer) => lazy(() =>
  importer().then((m) => {
    sessionStorage.removeItem('jp_chunk_reload');
    return m;
  }).catch((err) => {
    if (!sessionStorage.getItem('jp_chunk_reload')) {
      sessionStorage.setItem('jp_chunk_reload', '1');
      window.location.reload();
      return new Promise(() => {}); // bloque le rendu le temps du rechargement
    }
    throw err;
  })
);

// Veilleur de version : chaque build embarque /version.json. Quand une nouvelle
// version est déployée, l'app ouverte (même la PWA iPhone) la détecte au retour
// au premier plan et se recharge toute seule — fini les vieux écrans en cache.
function VersionWatcher() {
  useEffect(() => {
    let current = null;
    const check = async () => {
      try {
        // ?t=… : contourne aussi le cache du CDN (sinon X-Vercel-Cache: HIT)
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        const { v } = await r.json();
        if (current === null) current = v;
        else if (v && v !== current) window.location.reload();
      } catch { /* hors-ligne : on réessaiera */ }
    };
    check();
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    const timer = setInterval(check, 5 * 60 * 1000);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(timer); };
  }, []);
  return null;
}

const LandingPage = lazyReload(() => import('./views/LandingPage'));
const BoutiquesDirectory = lazyReload(() => import('./views/BoutiquesDirectory'));
const MerchantConsole = lazyReload(() => import('./views/merchant/MerchantConsole'));
const PublicStorefront = lazyReload(() => import('./views/shop/PublicStorefront'));
const DeveloperConsole = lazyReload(() => import('./views/admin/DeveloperConsole'));

function App() {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <VersionWatcher />
        <PullToRefresh />
        <ScrollToTop />
        <Toaster />
        <Router>
          <Suspense fallback={
            <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', gap: '18px' }}>
              <div style={{ width: '28px', height: '28px', border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }}></div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          }>
            <Routes>
              <Route path="/"            element={<LandingPage />} />
              <Route path="/boutiques"   element={<BoutiquesDirectory />} />
              <Route path="/marchand"    element={<MerchantConsole />} />
              <Route path="/marchand/*"  element={<MerchantConsole />} />
              {/* Alias rétro-compatible (anciens liens /merchant) */}
              <Route path="/merchant"    element={<MerchantConsole />} />
              <Route path="/merchant/*"  element={<MerchantConsole />} />
              <Route path="/shop/:shopSlug" element={<PublicStorefront />} />
              <Route path="/admin"       element={<DeveloperConsole />} />
              {/* Alias rétro-compatible (ancien lien /dev) */}
              <Route path="/dev"         element={<DeveloperConsole />} />
            </Routes>
          </Suspense>
        </Router>
      </TenantProvider>
    </ErrorBoundary>
  );
}

export default App;

