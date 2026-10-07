import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { BarChart2, TrendingUp, Shield, Users } from 'lucide-react';

export const SafetyAnalytics = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Safety Analytics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Safe Routes Taken', value: '124', icon: Shield, color: 'text-green-600' },
          { title: 'Community Reports', value: '89', icon: Users, color: 'text-indigo-600' },
          { title: 'Safety Score Trend', value: '+12%', icon: TrendingUp, color: 'text-green-600' },
          { title: 'Total Incidents', value: '14', icon: BarChart2, color: 'text-amber-600' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-800 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Type</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 m-6 mt-0">
            <p className="text-slate-500 dark:text-slate-400">Chart visualization will go here</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Safety Score over Time</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 m-6 mt-0">
            <p className="text-slate-500 dark:text-slate-400">Chart visualization will go here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
