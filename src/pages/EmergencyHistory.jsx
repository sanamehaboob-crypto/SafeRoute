import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { AlertCircle, MapPin, Share2, ShieldAlert, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Button } from '../components/ui/Button';

export const EmergencyHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHistory([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('sos_sessions')
        .select(`
          id,
          status,
          start_time,
          end_time,
          sos_location_updates (
            latitude,
            longitude
          )
        `)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (fetchError) throw fetchError;
      
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch emergency history:", err);
      setError("Unable to load history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Emergency History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">A log of your past safety actions and SOS triggers.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading} className="text-slate-600 dark:text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 \${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
          <CardContent className="py-8 text-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchHistory} className="mt-4 border-red-200 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="max-w-4xl mx-auto p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
          <RefreshCw className="h-8 w-8 animate-spin mb-4 text-purple-600" />
          Loading history...
        </div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShieldAlert className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No emergency activity yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
              Your SOS and location-sharing events will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & Time</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((item) => {
                  const locations = item.sos_location_updates || [];
                  const lastLoc = locations.length > 0 ? locations[locations.length - 1] : null;
                  const locString = lastLoc ? `${lastLoc.latitude.toFixed(4)}, \${lastLoc.longitude.toFixed(4)}` : 'Location not captured';
                  
                  return (
                    <tr key={item.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDate(item.start_time)}
                        </div>
                        {item.end_time && (
                          <div className="text-xs mt-0.5">
                            Ended: {formatDate(item.end_time)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-red-500" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">SOS Triggered</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Emergency event initiated. WhatsApp notification status: <span className="font-semibold">Not configured</span>.
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate max-w-[150px] inline-block">{locString}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Resolved' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
