import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // Map Supabase errors to user-friendly messages
      let displayMessage = error.message;
      if (error.message === 'Failed to fetch') {
        displayMessage = 'Unable to connect to the server. Please try again.';
      } else if (error.message === 'Invalid login credentials') {
        displayMessage = 'Incorrect email or password.';
      } else if (error.message.includes('configuration') || error.message.includes('API key')) {
        displayMessage = 'Authentication is temporarily unavailable. Please try again.';
      }
      
      toast.error(displayMessage);
      setLoading(false);
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
        
      toast.success("Successfully logged in");
      if (profile?.role === 'admin') {
        navigate('/admin/incidents');
      } else {
        navigate('/home');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 dark:bg-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-purple-600" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Or{' '}
          <Link to="/register" className="font-bold text-purple-600 hover:text-purple-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="py-8 px-4 sm:px-10">
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email address</label>
                <div className="mt-1">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                <div className="mt-1">
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-700 rounded" />
                  <label className="ml-2 block text-sm font-medium text-slate-900 dark:text-slate-100">Remember me</label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-bold text-purple-600 hover:text-purple-500">Forgot password?</a>
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Sign in
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Register = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    
    if (error) {
      // Map Supabase errors to user-friendly messages
      let displayMessage = error.message;
      if (error.message === 'Failed to fetch') {
        displayMessage = 'Unable to connect to the server. Please try again.';
      } else if (error.message.includes('configuration') || error.message.includes('API key')) {
        displayMessage = 'Authentication is temporarily unavailable. Please try again.';
      }
      
      toast.error(displayMessage);
      setLoading(false);
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
        
      toast.success("Account created successfully!");
      if (profile?.role === 'admin') {
        navigate('/admin/incidents');
      } else {
        navigate('/home');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 dark:bg-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-purple-600" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-purple-600 hover:text-purple-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="py-8 px-4 sm:px-10">
            <form className="space-y-6" onSubmit={handleRegister}>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Full name</label>
                <div className="mt-1">
                  <Input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email address</label>
                <div className="mt-1">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                <div className="mt-1">
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Sign up
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
