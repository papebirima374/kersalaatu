import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import ErrorBoundary from './ErrorBoundary';
import LandingPage from './views/LandingPage';
import MerchantConsole from './views/merchant/MerchantConsole';
import PublicStorefront from './views/shop/PublicStorefront';
import DeveloperConsole from './views/admin/DeveloperConsole';

function App() {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <Router>
          <Routes>
            <Route path="/"           element={<LandingPage />} />
            <Route path="/merchant"   element={<MerchantConsole />} />
            <Route path="/merchant/*" element={<MerchantConsole />} />
            <Route path="/shop/:shopSlug" element={<PublicStorefront />} />
            <Route path="/admin"      element={<DeveloperConsole />} />
          </Routes>
        </Router>
      </TenantProvider>
    </ErrorBoundary>
  );
}

export default App;
