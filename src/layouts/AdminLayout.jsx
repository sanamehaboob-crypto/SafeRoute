import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { ShieldAlert, Users, Map, Settings, AlertTriangle, FileText, Bell } from 'lucide-react';
import { supabase } from '../services/supabase';

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin/dashboard', icon: ShieldAlert },
  { name: 'Incidents', href: '/admin/incidents', icon: FileText },
  { name: 'Lighting & Activity', href: '/admin/map-data', icon: Map },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Active SOS', href: '/admin/active-sos', icon: AlertTriangle },
  { name: 'Safety Settings', href: '/admin/settings', icon: Settings },
];

export const AdminLayout = () => {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAdmin(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      if (error || data?.role !== 'admin') {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  if (isAdmin === null) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-500">Authenticating Admin...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/home" />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="flex h-16 shrink-0 items-center gap-x-2 border-b border-slate-800 px-6">
          <ShieldAlert className="h-8 w-8 text-purple-500" />
          <span className="text-lg font-bold">Admin Portal</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {adminNavigation.map(item => (
            <Link key={item.name} to={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white">
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="font-semibold text-slate-800">Admin Control Center</h2>
          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5 text-slate-500" />
            <div className="h-8 w-8 bg-purple-600 rounded-full text-white flex items-center justify-center font-bold">A</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
