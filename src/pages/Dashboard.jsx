import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MapPin, ShieldAlert, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Good Evening, User</h1>
          <p className="text-slate-600 dark:text-slate-400">Here's your safety overview for today.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link to="/report-incident" className="flex-1 sm:flex-none">
            <Button variant="danger" className="w-full">
              <ShieldAlert className="h-4 w-4 mr-2" /> Report
            </Button>
          </Link>
          <Link to="/route-planner" className="flex-1 sm:flex-none">
            <Button className="w-full">
              <MapPin className="h-4 w-4 mr-2" /> Plan Route
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-indigo-600 text-white border-none">
          <CardContent className="p-6">
            <h3 className="text-indigo-100 font-medium mb-1">Area Safety Score</h3>
            <div className="text-4xl font-bold mb-4">8.5<span className="text-xl text-indigo-300 font-normal">/10</span></div>
            <p className="text-sm text-indigo-100 flex items-center">
              <ShieldAlert className="h-4 w-4 mr-1" />
              Generally safe in your current location
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-slate-500 dark:text-slate-400 font-medium mb-1">Active Incidents</h3>
            <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">3</div>
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
              Within 5km radius
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-slate-500 dark:text-slate-400 font-medium mb-1">Saved Routes</h3>
            <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">4</div>
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Home, Work, Gym, Cafe
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Routes</CardTitle>
            <Link to="/route-planner" className="text-sm text-indigo-600 font-medium flex items-center hover:underline">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { from: 'Office', to: 'Home', time: '45 mins', score: 9.2, date: 'Today, 6:30 PM' },
                { from: 'Gym', to: 'Home', time: '15 mins', score: 8.5, date: 'Yesterday, 8:00 PM' }
              ].map((route, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full">
                      <MapPin className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{route.from} to {route.to}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{route.date} • {route.time}</div>
                    </div>
                  </div>
                  <Badge variant={route.score >= 9 ? 'safe' : 'warning'}>Score: {route.score}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Incidents Nearby</CardTitle>
            <Link to="/safety-map" className="text-sm text-indigo-600 font-medium flex items-center hover:underline">
              View map <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { type: 'Poor Lighting', loc: 'Main St & 5th Ave', time: '2 hours ago', severity: 'warning' },
                { type: 'Suspicious Activity', loc: 'Park Pathway', time: '5 hours ago', severity: 'danger' }
              ].map((inc, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className={`p-2 rounded-full ${inc.severity === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{inc.type}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{inc.loc}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{inc.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
