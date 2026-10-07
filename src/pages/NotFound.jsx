import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800 flex flex-col justify-center items-center px-4">
      <h1 className="text-9xl font-extrabold text-indigo-100">404</h1>
      <div className="text-center -mt-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Page not found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Sorry, we couldn't find the page you're looking for.</p>
        <Link to="/">
          <Button>Go back home</Button>
        </Link>
      </div>
    </div>
  );
};
