import React, { useState, useEffect } from 'react';
import { ProfileTab } from './ProfileTab';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UserPlus, Bell, Shield, MapPin, Eye, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

const Toggle = ({ enabled, onChange, label, description, disabled }) => (
  <div className={`flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 ${disabled ? 'opacity-60' : ''}`}>
    <div className="flex-1 pr-4">
      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</h4>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    <button
      type="button"
      disabled={disabled}
      className={`${
        enabled ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2`}
      onClick={() => onChange(!enabled)}
    >
      <span
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [locationStatus, setLocationStatus] = useState('Checking...');
  const [hasContacts, setHasContacts] = useState(true);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('user_settings');
    return saved ? JSON.parse(saved) : {
      pushNotifications: true,
      emailAlerts: false,
      locationTracking: true,
      shareLocationWithContacts: true,
      darkMode: false,
      twoFactorAuth: false,
      profileVisibility: 'contacts'
    };
  });

  useEffect(() => {
    const checkContacts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from('emergency_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setHasContacts(count > 0);
      }
    };
    checkContacts();
  }, []);

  useEffect(() => {
    let watchId;
    if (settings.locationTracking) {
      if (!navigator.geolocation) {
        setLocationStatus("Browser unsupported.");
        return;
      }
      setLocationStatus("Requesting permission...");
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocationStatus("Location access enabled. Current location available.");
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationStatus("Location permission was denied. Enable location access in your browser settings to use location-based features.");
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setLocationStatus("Location unavailable.");
          } else if (err.code === err.TIMEOUT) {
            setLocationStatus("Location request timed out.");
          }
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationStatus("Location access is disabled.");
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [settings.locationTracking]);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    
    // Automatically disable sharing if tracking is disabled
    if (key === 'locationTracking' && !value) {
      newSettings.shareLocationWithContacts = false;
    }
    
    setSettings(newSettings);
    localStorage.setItem('user_settings', JSON.stringify(newSettings));
    
    if (key === 'darkMode') {
      document.documentElement.classList.toggle('dark', value);
    }
    
    toast.success("Settings updated");
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="md:w-64 flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 px-3">Settings</h2>
        {[
          { id: 'profile', icon: UserPlus, label: 'Profile' },
          { id: 'notifications', icon: Bell, label: 'Notifications' },
          { id: 'privacy', icon: Shield, label: 'Privacy' },
          { id: 'location', icon: MapPin, label: 'Location' },
          { id: 'appearance', icon: Eye, label: 'Appearance' },
          { id: 'security', icon: Lock, label: 'Security' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors \${
              activeTab === item.id 
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:bg-purple-900/30 dark:text-purple-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {activeTab === 'profile' && (
          <ProfileTab />
        )}

        {activeTab === 'notifications' && (
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="dark:border-slate-800">
              <CardTitle className="dark:text-slate-100">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Toggle 
                label="Push Notifications" 
                description="Receive alerts on your device for emergency updates."
                enabled={settings.pushNotifications}
                onChange={v => updateSetting('pushNotifications', v)}
              />
              <Toggle 
                label="Email Alerts" 
                description="Receive daily safety summaries via email."
                enabled={settings.emailAlerts}
                onChange={v => updateSetting('emailAlerts', v)}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'privacy' && (
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="dark:border-slate-800">
              <CardTitle className="dark:text-slate-100">Privacy Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">Profile Visibility</label>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Who can see your profile on the network.</p>
                <select 
                  className="w-full sm:w-64 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-slate-100"
                  value={settings.profileVisibility}
                  onChange={(e) => updateSetting('profileVisibility', e.target.value)}
                >
                  <option value="public">Public</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'location' && (
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="dark:border-slate-800">
              <CardTitle className="dark:text-slate-100">Location Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Toggle 
                label="Enable Location Tracking" 
                description="Allow SafeRoute to access your live location for safety features."
                enabled={settings.locationTracking}
                onChange={v => updateSetting('locationTracking', v)}
              />
              <div className="text-sm px-1 py-1 mb-2 font-medium text-purple-600 dark:text-purple-400">
                Status: {locationStatus}
              </div>
              <Toggle 
                label="Share Location with Contacts" 
                description="Automatically share your location with emergency contacts during an SOS."
                enabled={settings.shareLocationWithContacts}
                onChange={v => updateSetting('shareLocationWithContacts', v)}
                disabled={!settings.locationTracking}
              />
              {!settings.locationTracking && (
                <p className="text-xs text-amber-600 dark:text-amber-500 px-1">
                  Location Tracking must be enabled before location can be shared.
                </p>
              )}
              {!hasContacts && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-800 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
                  <p>No emergency contacts are configured yet.</p>
                  <button onClick={() => setActiveTab('profile')} className="text-purple-600 dark:text-purple-400 font-medium hover:underline mt-1">
                    Manage Emergency Contacts →
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'appearance' && (
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="dark:border-slate-800">
              <CardTitle className="dark:text-slate-100">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Toggle 
                label="Dark Mode" 
                description="Switch to a dark theme."
                enabled={settings.darkMode}
                onChange={v => updateSetting('darkMode', v)}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="dark:border-slate-800">
              <CardTitle className="dark:text-slate-100">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Toggle 
                label="Two-Factor Authentication" 
                description="Require an extra step to sign in to your account."
                enabled={settings.twoFactorAuth}
                onChange={v => updateSetting('twoFactorAuth', v)}
              />
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" className="text-slate-700 dark:text-slate-300 dark:border-slate-700" onClick={() => toast.success("Password reset email sent!")}>
                  Reset Password
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
