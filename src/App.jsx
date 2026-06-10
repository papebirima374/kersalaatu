import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import ErrorBoundary from './ErrorBoundary';
import { Toaster } from './components/toast';
import PullToRefresh from './PullToRefresh';
import ScrollToTop from './ScrollToTop';

const LandingPage = lazy(() => import('./views/LandingPage'));
const MerchantConsole = lazy(() => import('./views/merchant/MerchantConsole'));
const PublicStorefront = lazy(() => import('./views/shop/PublicStorefront'));
const DeveloperConsole = lazy(() => import('./views/admin/DeveloperConsole'));

function App() {
  return (
    <ErrorBoundary>
      <TenantProvider>
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
              <Route path="/marchand"    element={<MerchantConsole />} />
              <Route path="/marchand/*"  element={<MerchantConsole />} />
              {/* Alias rétro-compatible (anciens liens /merchant) */}
              <Route path="/merchant"    element={<MerchantConsole />} />
              <Route path="/merchant/*"  element={<MerchantConsole />} />
              <Route path="/shop/:shopSlug" element={<PublicStorefront />} />
              <Route path="/admin"       element={<DeveloperConsole />} />
            </Routes>
          </Suspense>
        </Router>
      </TenantProvider>
    </ErrorBoundary>
  );
}

export default App;

