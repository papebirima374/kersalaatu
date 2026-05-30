import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import LandingPage from './views/LandingPage';
import MerchantConsole from './views/merchant/MerchantConsole';
import PublicStorefront from './views/shop/PublicStorefront';
import DeveloperConsole from './views/admin/DeveloperConsole';

function App() {
  return (
    <TenantProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/merchant" element={<MerchantConsole />} />
          <Route path="/merchant/*" element={<MerchantConsole />} />
          <Route path="/shop/:shopSlug" element={<PublicStorefront />} />
          <Route path="/admin" element={<DeveloperConsole />} />
        </Routes>
      </Router>
    </TenantProvider>
  );
}

export default App;
