import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';

// Chargement paresseux — chaque route est un chunk séparé
const importMerchant   = () => import('./views/merchant/MerchantConsole');
const importStorefront = () => import('./views/shop/PublicStorefront');
const importAdmin      = () => import('./views/admin/DeveloperConsole');

const LandingPage      = lazy(() => import('./views/LandingPage'));
const MerchantConsole  = lazy(importMerchant);
const PublicStorefront = lazy(importStorefront);
const DeveloperConsole = lazy(importAdmin);

// Écran de chargement minimal
function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid #0d9488',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  // Précharge les autres pages en arrière-plan dès que le navigateur est libre
  // → la navigation entre les pages devient quasi instantanée
  useEffect(() => {
    const preload = () => { importMerchant(); importStorefront(); importAdmin(); };
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(preload, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(preload, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <TenantProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"           element={<LandingPage />} />
            <Route path="/merchant"   element={<MerchantConsole />} />
            <Route path="/merchant/*" element={<MerchantConsole />} />
            <Route path="/shop/:shopSlug" element={<PublicStorefront />} />
            <Route path="/admin"      element={<DeveloperConsole />} />
          </Routes>
        </Suspense>
      </Router>
    </TenantProvider>
  );
}

export default App;
