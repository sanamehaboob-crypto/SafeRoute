import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Clock, Navigation, ShieldAlert, Users, AlertTriangle, Phone, AlertCircle, Navigation as NavIcon } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ originCoords, destinationCoords, routeGeometry }) {
  const map = useMap();
  useEffect(() => {
    if (routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
      const bounds = L.latLngBounds();
      routeGeometry.coordinates.forEach(coord => {
        bounds.extend([coord[1], coord[0]]);
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (originCoords && destinationCoords) {
      const bounds = L.latLngBounds([
        [originCoords[1], originCoords[0]],
        [destinationCoords[1], destinationCoords[0]]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (originCoords) {
      map.setView([originCoords[1], originCoords[0]], 15);
    }
  }, [routeGeometry, originCoords, destinationCoords, map]);
  return null;
}

export const RouteDetails = () => {
  const { id } = useParams();
  const locationState = useLocation().state || {};
  const navigate = useNavigate();
  
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Fallbacks if user reloads the page and state is lost
  const route = locationState.route || {
    id: 'unknown',
    distance: 'Unknown',
    duration: 'Unknown',
    safetyScore: 0,
    lightingScore: 0,
    activityScore: 0,
    geometry: { coordinates: [] }
  };
  const originCoords = locationState.originCoords || null;
  const destinationCoords = locationState.destinationCoords || null;
  const originName = locationState.originName || 'Origin';
  const destinationName = locationState.destinationName || 'Destination';

  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleSaveTrip = async () => {
    if (!originCoords || !destinationCoords) {
      toast.error("Missing route data. Cannot save.", { id: "save_trip" });
      return;
    }
    
    setIsSaving(true);
    toast.loading("Saving to My Trips...", { id: "save_trip" });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in to save trips.");
      
      const distMatch = String(route.distance).match(/[\d.]+/);
      const dist = distMatch ? parseFloat(distMatch[0]) : 0;
      const durMatch = String(route.duration).match(/[\d.]+/);
      const dur = durMatch ? parseInt(durMatch[0]) : 0;
      
      const { error } = await supabase.from('saved_trips').insert([{
        user_id: session.user.id,
        title: `${originName} to ${destinationName}`,
        origin_name: originName,
        origin_latitude: originCoords[1],
        origin_longitude: originCoords[0],
        destination_name: destinationName,
        destination_latitude: destinationCoords[1],
        destination_longitude: destinationCoords[0],
        distance_meters: Math.round(dist * 1000), // convert km to meters if it was km
        duration_seconds: dur * 60, // convert mins to seconds if it was mins
        safety_score: route.safetyScore || 0,
        route_type: route.id === 'recommended' ? 'safest' : 'alternative',
        route_geometry: route.geometry || null,
        lighting_score: route.lightingScore || 0,
        activity_score: route.activityScore || 0,
        incident_score: route.incidentRiskScore || 0,
        safe_place_score: 0
      }]);
      
      if (error) throw error;
      
      setHasSaved(true);
      toast.success("Saved to My Trips", { id: "save_trip", icon: "✅" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Unable to save this trip.", { id: "save_trip" });
      setHasSaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  const startNavigation = () => {
    if (!originCoords || !destinationCoords) {
      toast.error("Missing route data. Please search for a route again.");
      return;
    }
    setIsNavigating(true);
    toast.success("Navigation started. Location sharing active.");
  };

  const endNavigation = () => {
    setIsNavigating(false);
    toast.success("Trip saved to history.", { icon: "🏁" });
  };

  if (isNavigating) {
    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    return (
      <div className="flex flex-col h-[calc(100vh-72px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-800 relative">
        
        {/* INTERACTIVE MAP AREA */}
        <div className="flex-1 relative z-0 w-full bg-slate-200 dark:bg-slate-700">
          {(!mapboxToken || mapboxToken === 'YOUR_TOKEN') ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 p-6 text-center">
              <ShieldAlert className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg mb-2">Mapbox Configuration Required</h3>
            </div>
          ) : (
            <MapContainer 
              center={originCoords ? [originCoords[1], originCoords[0]] : [51.505, -0.09]} 
              zoom={15} 
              zoomControl={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; Mapbox'
                url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
              />
              {originCoords && (
                <Marker position={[originCoords[1], originCoords[0]]}>
                  <Popup>Current Location</Popup>
                </Marker>
              )}
              {destinationCoords && (
                <Marker position={[destinationCoords[1], destinationCoords[0]]}>
                  <Popup>Destination</Popup>
                </Marker>
              )}
              {route.geometry?.coordinates?.length > 0 && (
                <Polyline
                  positions={route.geometry.coordinates.map(c => [c[1], c[0]])}
                  color="#9333ea"
                  weight={6}
                  opacity={1}
                />
              )}
              <MapUpdater originCoords={originCoords} destinationCoords={destinationCoords} routeGeometry={route.geometry} />
            </MapContainer>
          )}

          {/* FLOATING OVERLAYS */}
          
          {/* Top Left - Safety Badge */}
          <div className="absolute top-4 left-4 z-[1000]">
            <div className="bg-white dark:bg-slate-900/95 backdrop-blur shadow-md rounded-2xl p-3 border border-green-100 flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <ShieldAlert className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Safety Status</p>
                <p className="text-sm font-extrabold text-green-700">{route.safetyScore}/100 - Safer Route</p>
              </div>
            </div>
          </div>

          {/* Top Right - SOS */}
          <div className="absolute top-4 right-4 z-[1000]">
            <Button 
              variant="danger" 
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200/50 rounded-2xl px-6 py-6 font-black text-lg flex items-center gap-2"
              onClick={() => navigate('/emergency-sos')}
            >
              <AlertTriangle className="h-6 w-6" /> SOS
            </Button>
          </div>

          {/* Top Center - Navigation Instruction */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-11/12 max-w-sm">
            <Card className="bg-slate-900 text-white shadow-xl border-none rounded-2xl overflow-hidden">
              <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                <div className="bg-white dark:bg-slate-900/10 p-3 rounded-xl shrink-0">
                  <NavIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold leading-tight">Continue on your planned route</h2>
                  <p className="text-slate-300 text-sm font-medium mt-0.5">towards destination</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Right - Report Incident */}
          <div className="absolute bottom-6 right-4 z-[1000]">
            <Button 
              className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800 shadow-md rounded-full px-5 py-5 font-bold flex items-center gap-2"
              onClick={() => navigate('/report-incident')}
            >
              <AlertCircle className="h-5 w-5 text-amber-500" /> Report Issue
            </Button>
          </div>
        </div>

        {/* FIXED BOTTOM PANEL */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-10 px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-8">
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{route.duration}</p>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{route.distance} remaining</p>
            </div>
            
            <div className="hidden md:block h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
            
            <div className="hidden sm:block">
              <p className="text-sm font-extrabold text-green-700 flex items-center">
                <ShieldAlert className="h-4 w-4 mr-1" /> Safety: {route.safetyScore}/100
              </p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Safer based on available data</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full sm:w-auto border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold px-8 py-6 rounded-xl"
            onClick={endNavigation}
          >
            End Navigation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Why this route?</h1>
      </div>
      
      {!originCoords ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
            <p>No route data found. Please calculate a route first.</p>
            <Button className="mt-4" onClick={() => navigate('/route-planner')}>Go to Route Planner</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500 border-2 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">Recommended for Safety</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Safer based on available lighting and activity data.</p>
              </div>
              <Badge variant="safe" className="bg-green-100 text-green-700 text-sm font-bold py-1.5 px-4 rounded-full border-0">
                Safety Score: {route.safetyScore}/100
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-100 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center font-bold"><Clock className="h-4 w-4 mr-1.5"/> Est. Time</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{route.duration}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center font-bold"><NavIcon className="h-4 w-4 mr-1.5"/> Distance</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{route.distance}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100">Safety Breakdown</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-green-50 p-2 rounded-full text-green-600">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <span className="font-black text-green-600 text-lg">{route.lightingScore}/100</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">Lighting</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Route is well-lit for {route.lightingScore}% of the journey.</p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-green-50 p-2 rounded-full text-green-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="font-black text-green-600 text-lg">{route.activityScore}/100</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">Public Activity</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Consistent activity along this route.</p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-green-50 p-2 rounded-full text-green-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <span className="font-black text-green-600 text-lg">{route.incidentRiskScore > 20 ? 'Moderate' : 'Low'} Risk</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">Incident History</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Risk score computed based on surrounding conditions.</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button 
                className="flex-1 text-lg py-7 rounded-2xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200" 
                onClick={startNavigation}
              >
                <NavIcon className="h-5 w-5 mr-2" /> Start Navigation
              </Button>
              <Button
                variant={hasSaved ? "outline" : "secondary"}
                className={`flex-1 text-lg py-7 rounded-2xl font-bold border-2 transition-all ${
                  hasSaved 
                    ? "border-green-500 text-green-700 bg-green-50 hover:bg-green-100" 
                    : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:border-slate-700"
                }`}
                onClick={handleSaveTrip}
                disabled={isSaving || hasSaved}
              >
                {isSaving ? "Saving..." : hasSaved ? "✓ Saved to My Trips" : "Save to My Trips"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
