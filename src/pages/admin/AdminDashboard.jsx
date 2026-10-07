import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ShieldAlert, Users, FileText, AlertTriangle } from 'lucide-react';

export const AdminDashboard = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Overview</h1>
    
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg text-purple-600"><FileText /></div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">42</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Total Reports</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><AlertTriangle /></div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">12</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Pending Reports</p>
        </CardContent>
      </Card>
      
      <Card className="border-red-500 border-2 bg-red-50">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-red-100 p-2 rounded-lg text-red-600"><ShieldAlert className="animate-pulse" /></div>
          </div>
          <h3 className="text-3xl font-bold text-red-700">1</h3>
          <p className="text-red-600 text-sm font-medium">Active SOS Sessions</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users /></div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">1,204</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Total Users</p>
        </CardContent>
      </Card>
    </div>
    
    <Card>
      <CardHeader>
        <CardTitle>Recent Incident Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-slate-500 dark:text-slate-400 p-8 text-center border-2 border-dashed rounded-lg">
          Connect Supabase to view live incident reports.
        </div>
      </CardContent>
    </Card>
  </div>
);
