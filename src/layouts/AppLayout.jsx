import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, Bell, User, ArrowLeft, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/home' || location.pathname === '/';
  
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      if (!session) navigate('/login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate('/login');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center dark:text-slate-300">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 lg:px-12 shadow-sm">
        <div className="flex items-center gap-6">
          {!isHome && (
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/home" className="flex items-center gap-x-2">
            <div className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 p-1.5 rounded-lg">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">SafeRoute</span>
          </Link>
          <span className="hidden md:block text-purple-600/80 dark:text-purple-400/80 font-medium text-sm ml-2">Stay safer. Travel smarter.</span>
        </div>

        <div className="flex items-center gap-x-6">
          <Link to="/notifications" className="text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors relative">
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 border border-white dark:border-slate-900"></span>
          </Link>
          
          <Link to="/profile" className="flex items-center gap-x-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full py-1.5 px-3 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
              <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="hidden sm:block text-sm font-bold text-slate-900 dark:text-slate-100 max-w-[120px] truncate">
              {session?.user?.user_metadata?.full_name || session?.user?.email || 'User'}
            </span>
          </Link>
          
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-600 transition-colors" title="Log out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full bg-slate-50 dark:bg-slate-900">
        <Outlet />
      </main>
    </div>
  );
};
