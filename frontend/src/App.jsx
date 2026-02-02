import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ReportingPage from './pages/ReportingPage';
import AuthPage from './pages/AuthPage';
import PHCDashboard from './pages/PHCDashboard';
import LabDashboard from './pages/LabDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/report" element={<ReportingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/phc-dashboard" element={<PHCDashboard />} />
        <Route path="/lab-dashboard" element={<LabDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
