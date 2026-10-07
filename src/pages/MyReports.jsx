import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Navigation, Calendar, Clock, ArrowRight, MapPin, Loader2, RefreshCw, Route, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const MyReports = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setTrips([]);
        return;
      }
      
      const query = supabase
        .from('saved_trips')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      const { data, error } = await Promise.race([
        query,
        timeoutPromise
      ]);
        
      if (error) {
        if (error.code === '42P01') {
          throw new Error("Table does not exist");
        }
        throw error;
      }
      
      setTrips(data || []);
    } catch (error) {
      console.warn("Supabase fetch failed", error);
      toast.error("Unable to load your trips. Please retry.");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this saved trip?")) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase.from('saved_trips').delete().eq('id', id);
      if (error) throw error;
      
      setTrips(prev => prev.filter(t => t.id !== id));
      toast.success("Trip deleted");
    } catch (err) {
      console.error(err);
      toast.error("Unable to delete this trip. Please retry.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handlePlanAgain = (trip) => {
    navigate(`/route-planner?dest=${encodeURIComponent(trip.destination_name)}`, { 
      state: { 
        originName: trip.origin_name,
        originCoords: [trip.origin_longitude, trip.origin_latitude],
        destCoords: [trip.destination_longitude, trip.destination_latitude]
      } 
    });
  };

  const handleViewTrip = (trip) => {
    // Reconstruct route object for RouteDetails
    const distanceKm = trip.distance_meters ? (trip.distance_meters / 1000).toFixed(1) : null;
    const durationMins = trip.duration_seconds ? Math.round(trip.duration_seconds / 60) : null;
    
    const reconstructedRoute = {
      id: trip.route_type === 'safest' ? 'recommended' : trip.id,
      distance: distanceKm ? `${distanceKm} km` : 'Unknown',
      duration: durationMins ? `${durationMins} min` : 'Unknown',
      safetyScore: trip.safety_score || 0,
      lightingScore: trip.lighting_score || 0,
      activityScore: trip.activity_score || 0,
      incidentRiskScore: trip.incident_score || 0,
      geometry: trip.route_geometry || { coordinates: [] }
    };

    navigate(`/route/${trip.id}`, {
      state: {
        route: reconstructedRoute,
        originCoords: [trip.origin_longitude, trip.origin_latitude],
        destinationCoords: [trip.destination_longitude, trip.destination_latitude],
        originName: trip.origin_name,
        destinationName: trip.destination_name
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Trip History</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review your previously planned safe routes.</p>
        </div>
        <Button variant="outline" onClick={fetchTrips} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <Card className="text-center p-12 bg-slate-50 dark:bg-slate-800 border-dashed">
          <Route className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No trips taken yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">Plan a route and save it here for quick access later.</p>
          <Button onClick={() => navigate('/route-planner')}>
            <Navigation className="h-4 w-4 mr-2" /> Plan a Safer Route
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <Card key={trip.id} className="hover:border-purple-200 transition-colors">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Route Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{formatDate(trip.created_at)}</span>
                      
                      <Badge variant={trip.safety_score >= 80 ? 'safe' : (trip.safety_score >= 60 ? 'warning' : 'danger')} className="ml-2">
                        Safety: {trip.safety_score}
                      </Badge>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                        <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-700 my-1"></div>
                        <MapPin className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="space-y-4 flex-1">
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Origin</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{trip.origin_name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Destination</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{trip.destination_name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats & Actions */}
                  <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-between md:items-end min-w-[200px] border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="flex gap-4 md:justify-end text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <span className="flex items-center"><Route className="h-4 w-4 mr-1 text-slate-400 dark:text-slate-500"/> {trip.distance_meters ? `${(trip.distance_meters/1000).toFixed(1)} km` : '-'}</span>
                      <span className="flex items-center"><Clock className="h-4 w-4 mr-1 text-slate-400 dark:text-slate-500"/> {trip.duration_seconds ? `${Math.round(trip.duration_seconds/60)} min` : '-'}</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button variant="outline" className="flex-1 sm:flex-none border-slate-200 dark:border-slate-700" onClick={() => handleViewTrip(trip)}>
                        View Trip
                      </Button>
                      <Button variant="primary" className="flex-1 sm:flex-none" onClick={() => handlePlanAgain(trip)}>
                        Plan Again
                      </Button>
                      <Button variant="ghost" className="flex-none text-red-500 hover:text-red-700 hover:bg-red-50 px-3" onClick={() => handleDelete(trip.id)} disabled={deletingId === trip.id}>
                        {deletingId === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
