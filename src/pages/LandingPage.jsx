import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Map, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800 flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">SafeRoute</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/register">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight max-w-3xl mb-6">
          Navigate your city with <span className="text-indigo-600">confidence</span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10">
          Smart routing based on real-time safety data, lighting, and community reports to help you find the safest path to your destination.
        </p>
        <Link to="/login">
          <Button size="lg" className="gap-2">
            Get Started <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl w-full text-left">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <Map className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Safe Routing</h3>
            <p className="text-slate-600 dark:text-slate-400">Our algorithm calculates routes based on safety scores, not just distance or time.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Community Reports</h3>
            <p className="text-slate-600 dark:text-slate-400">Stay informed with real-time incident reporting from other users in your area.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Safety First</h3>
            <p className="text-slate-600 dark:text-slate-400">Factors like street lighting and public activity are prioritized for night travel.</p>
          </div>
        </div>
      </main>
    </div>
  );
};
