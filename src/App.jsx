import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';

// Chargement paresseux — chaque route est un chunk séparé
const LandingPage      = lazy(() => import('./views/LandingPage'));
const MerchantConsole  = lazy(() => import('./views/merchant/MerchantConsole'));
const PublicStorefront = lazy(() => import('./views/shop/PublicStorefront'));
const DeveloperConsole = lazy(() => import('./views/admin/DeveloperConsole'));

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
