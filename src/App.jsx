import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { RoutePlanner } from './pages/RoutePlanner';
import { SafetyMap } from './pages/SafetyMap';
import { ReportIncident } from './pages/ReportIncident';
import { SafetyAnalytics } from './pages/SafetyAnalytics';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';
import { EmergencyHistory } from './pages/EmergencyHistory';
import { Login, Register } from './pages/AuthPages';
import { NotFound } from './pages/NotFound';
import { RouteDetails } from './pages/RouteDetails';
import { Home } from './pages/Home';
import { EmergencySOS } from './pages/EmergencySOS';
import { SavedPlaces } from './pages/SavedPlaces';
import { MyReports } from './pages/MyReports';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminIncidents } from './pages/admin/AdminIncidents';
import { Toaster } from 'react-hot-toast';

function App() {
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        const { darkMode } = JSON.parse(savedSettings);
        document.documentElement.classList.toggle('dark', !!darkMode);
      }
    } catch (e) {
      console.error('Failed to parse settings for dark mode', e);
    }
  }, []);

  return (
    <BrowserRouter>
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-slate-100',
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/route-planner" element={<RoutePlanner />} />
          <Route path="/route/:id" element={<RouteDetails />} />
          <Route path="/emergency-sos" element={<EmergencySOS />} />
          <Route path="/places" element={<SavedPlaces />} />
          <Route path="/my-reports" element={<MyReports />} />
          <Route path="/safety-map" element={<SafetyMap />} />
          <Route path="/report-incident" element={<ReportIncident />} />
          <Route path="/analytics" element={<SafetyAnalytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/emergency-history" element={<EmergencyHistory />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="incidents" element={<AdminIncidents />} />
          <Route path="map-data" element={<div className="p-8">Map Data Management Placeholder</div>} />
          <Route path="users" element={<div className="p-8">User Management Placeholder</div>} />
          <Route path="active-sos" element={<div className="p-8">Active SOS Monitor Placeholder</div>} />
          <Route path="settings" element={<div className="p-8">Safety Settings Placeholder</div>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
