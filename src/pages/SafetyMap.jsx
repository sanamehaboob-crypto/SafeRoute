import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { AlertCircle, MapPin, Loader2, Filter, Shield, Sun, Moon, Layers, Navigation, Activity, Search, Crosshair, Map as MapIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const icons = {
  high: createIcon('#ef4444'),   // Red
  medium: createIcon('#f59e0b'), // Amber
  low: createIcon('#10b981'),    // Green
  safePlace: createIcon('#3b82f6') // Blue
};

const DEMO_INCIDENTS = [
  { id: 'demo1', incident_type: 'Poor Lighting', severity: 'Medium', latitude: 51.505, longitude: -0.09, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'demo2', incident_type: 'Suspicious Person', severity: 'High', latitude: 51.51, longitude: -0.1, created_at: new Date(Date.now() - 18000000).toISOString() },
  { id: 'demo3', incident_type: 'Harassment', severity: 'High', latitude: 51.515, longitude: -0.09, created_at: new Date(Date.now() - 86400000).toISOString() },
];

const DEMO_SAFE_PLACES = [
  { id: 'sp1', name: 'Central Police Station', category: 'Police', open: true, distance: '1.2 km', latitude: 51.502, longitude: -0.095 },
  { id: 'sp2', name: 'City Hospital', category: 'Hospital', open: true, distance: '2.5 km', latitude: 51.51, longitude: -0.085 },
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c) * 1000;
};

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Map rendering error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[560px] md:h-[620px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Map temporarily unavailable.</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mb-6">
            We encountered an unexpected error loading the map component.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Reusable Map Resize/Center hook
function MapUpdater({ center, triggerResize, popupInfo }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { duration: 1.5 });
    }
  }, [center, map]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timer);
  }, [map, triggerResize]);
  
  return null;
}

export const SafetyMap = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [center, setCenter] = useState([51.505, -0.09]);
  const [selectedAreaName, setSelectedAreaName] = useState("Current Location");
  const [usingDemo, setUsingDemo] = useState(false);
  const [resizeTrigger, setResizeTrigger] = useState(0);
  
  // Intelligence Layers State
  const [activeLayers, setActiveLayers] = useState({
    incidents: true,
    lighting: true,
    activity: true,
    safePlaces: true
  });
  
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState(null);
  
  const isDaytime = new Date().getHours() >= 6 && new Date().getHours() < 18;

  const [areaStats, setAreaStats] = useState({
    lighting: 80,
    activity: 65,
    incidents: 90,
    safePlaces: 75,
    overall: 84,
    concernLevel: 'Moderate concern',
    positives: ['Good lighting coverage and low incident rate in this area.'],
    concerns: []
  });

  const fetchIncidents = async () => {
    setLoading(true);
    setMapError(false);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      const query = supabase
        .from('incidents')
        .select('*')
        .eq('status', 'Approved')
        .order('created_at', { ascending: false });
        
      const { data, error } = await Promise.race([query, timeoutPromise]);
        
      if (error) {
        if (error.code === '42P01') throw new Error('Table missing');
        throw error;
      }
      setIncidents(data || []);
      setUsingDemo(false);
    } catch (err) {
      console.error("Supabase fetch failed", err);
      setIncidents(DEMO_INCIDENTS);
      setUsingDemo(true);
    } finally {
      setLoading(false);
      setResizeTrigger(prev => prev + 1);
    }
  };

  useEffect(() => {
    fetchIncidents();
    
    if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN === 'YOUR_TOKEN') {
      setMapError(true);
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
      });
    }
    
    const handleResize = () => setResizeTrigger(prev => prev + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!center) return;
    
    const radius = 1500; // 1.5km
    
    // Calculate distances for incidents
    let high = 0; let medium = 0; let low = 0;
    const currentIncidents = (incidents && incidents.length > 0) ? incidents : DEMO_INCIDENTS;
    
    currentIncidents.forEach(i => {
      if (i.latitude == null || i.longitude == null) return;
      const dist = getDistance(center[0], center[1], i.latitude, i.longitude);
      if (dist <= radius) {
        if (i.severity === 'High') high++;
        else if (i.severity === 'Medium') medium++;
        else low++;
      }
    });
    
    let nearbySPCount = 0;
    DEMO_SAFE_PLACES.forEach(sp => {
      if (getDistance(center[0], center[1], sp.latitude, sp.longitude) <= radius) {
        nearbySPCount++;
      }
    });
    
    // Scores
    let incScore = 100 - (high * 15 + medium * 8 + low * 3);
    incScore = Math.max(20, Math.min(100, incScore));
    
    let spScore = 50 + (nearbySPCount * 20);
    spScore = Math.max(0, Math.min(100, spScore));
    
    let baseLighting = Math.abs(Math.sin(center[0] * 100)) * 100;
    let baseActivity = Math.abs(Math.cos(center[1] * 100)) * 100;
    
    if (isDaytime) {
      baseLighting = Math.min(100, baseLighting + 40);
      baseActivity = Math.min(100, baseActivity + 30);
    } else {
      baseLighting = Math.max(20, baseLighting - 20);
      baseActivity = Math.max(10, baseActivity - 30);
    }
    
    const overall = Math.round((incScore * 0.4) + (spScore * 0.2) + (baseLighting * 0.2) + (baseActivity * 0.2));
    
    let concernLevel = 'Elevated concern';
    if (overall >= 75) concernLevel = 'Lower concern';
    else if (overall >= 50) concernLevel = 'Moderate concern';
    
    const positives = [];
    const concerns = [];
    
    if (incScore > 80) positives.push('Low recent incident activity nearby.');
    if (spScore >= 90) positives.push('Excellent access to safe places.');
    if (baseLighting > 75) positives.push('Good lighting coverage reported.');
    if (baseActivity > 70) positives.push('High public activity provides natural surveillance.');
    
    if (incScore < 50) concerns.push('High concentration of recent incidents.');
    if (spScore < 60) concerns.push('Few verified safe places within 1.5km.');
    if (baseLighting < 40) concerns.push('Areas of poor visibility reported.');
    if (baseActivity < 30) concerns.push('Isolated areas with low foot traffic.');
    
    if (positives.length === 0) positives.push('Stay aware of your surroundings.');
    if (concerns.length === 0) concerns.push('No major concerns identified.');
    
    setAreaStats({
      lighting: Math.round(baseLighting),
      activity: Math.round(baseActivity),
      incidents: Math.round(incScore),
      safePlaces: Math.round(spScore),
      overall,
      concernLevel,
      positives,
      concerns
    });
    
  }, [center, incidents, isDaytime]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        const dname = data[0].display_name.split(',').slice(0, 2).join(',');
        setSelectedAreaName(dname);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const locateUser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setSelectedAreaName("Current Location");
      });
    }
  };

  const handleRetry = () => {
    fetchIncidents();
    if (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) setMapError(false);
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const filteredIncidents = (incidents || []).filter(i => {
    if (i.latitude == null || i.longitude == null) return false;
    return filter === 'All' || i.severity === filter;
  });

  const handleIncidentClick = (inc) => {
    if (inc.latitude != null && inc.longitude != null) {
      setCenter([inc.latitude, inc.longitude]);
      setActiveIncidentId(inc.id);
    }
  };

  const toggleLayer = (layerId) => {
    setActiveLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  return (
    <div className="max-w-[1536px] mx-auto px-4 py-4 md:py-6 flex flex-col min-h-[calc(100vh-72px)] lg:h-[calc(100vh-72px)] lg:overflow-hidden">
      {/* 1. HEADER */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Safety Map</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Explore safety information around you.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Card className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
            <CardContent className="px-4 py-2 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Safety Index</p>
              <div className="flex items-end gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none">{areaStats.overall} / 100</span>
                <span className={`text-[10px] font-bold leading-none mb-[1px] ${areaStats.overall >= 75 ? 'text-green-600' : areaStats.overall >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {areaStats.concernLevel}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
            <CardContent className="px-4 py-2 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Current Conditions</p>
              <div className="flex items-center gap-1.5">
                {isDaytime ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none">{isDaytime ? 'Daytime' : 'Nighttime'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. LAYOUT: 30 / 70 */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(340px,380px)_minmax(0,1fr)] gap-4 lg:gap-6 pb-4">
        
                  {/* LEFT COLUMN: Area Summary */}
          <Card className="flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden lg:h-full shrink-0 lg:shrink">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Selected Area */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Selected Area</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-purple-600" /> {selectedAreaName}
                </p>
              </div>

              {/* Safety Breakdown */}
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 text-xs flex items-center tracking-wide">
                  <ShieldCheck className="h-4 w-4 mr-2 text-purple-600" /> AREA SAFETY SCORE
                </h3>
                
                <div className="space-y-2.5 mb-4">
                  {[
                    { id: 'lighting', label: 'Lighting', score: areaStats.lighting, color: 'bg-amber-500' },
                    { id: 'activity', label: 'Public Activity', score: areaStats.activity, color: 'bg-indigo-500' },
                    { id: 'incidents', label: 'Incident Safety', score: areaStats.incidents, color: 'bg-green-500' },
                    { id: 'safePlaces', label: 'Safe Places', score: areaStats.safePlaces, color: 'bg-blue-500' }
                  ].map(factor => (
                    <div key={factor.id} 
                      className={`cursor-pointer group px-2 py-1 -mx-2 rounded-lg transition-colors ${activeLayers[factor.id] ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:bg-slate-800/50 opacity-60'}`}
                      onClick={() => toggleLayer(factor.id)}
                    >
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700 dark:text-slate-300">{factor.label}</span>
                        <span className="text-slate-500 dark:text-slate-400">{factor.score}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                        <div className={`${factor.color} h-1 rounded-full`} style={{ width: `${factor.score}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-purple-50/50 dark:bg-purple-900/10 p-2.5 rounded-lg border border-purple-100/50 dark:border-purple-900/30">
                  <p className="text-[10px] font-bold text-purple-800 dark:text-purple-400 uppercase mb-1.5">Why this score?</p>
                  <div className="space-y-1">
                    {areaStats.positives.map((pos, idx) => (
                      <p key={idx} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start leading-tight">
                        <span className="text-green-600 font-bold mr-1.5">✓</span> {pos}
                      </p>
                    ))}
                    {areaStats.concerns.map((con, idx) => (
                      <p key={idx} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start leading-tight">
                        <span className="text-amber-600 font-bold mr-1.5">⚠️</span> {con}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Map Layers */}
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 text-xs flex items-center tracking-wide">
                  <Layers className="h-4 w-4 mr-2 text-purple-600" /> MAP LAYERS
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'incidents', label: 'Verified Reports', icon: AlertCircle, color: 'text-red-500' },
                    { id: 'lighting', label: 'Lighting Coverage', icon: Sun, color: 'text-amber-500' },
                    { id: 'activity', label: 'Public Activity', icon: Activity, color: 'text-indigo-500' },
                    { id: 'safePlaces', label: 'Safe Places', icon: Shield, color: 'text-blue-500' }
                  ].map(layer => (
                    <label key={layer.id} className="flex items-center justify-between cursor-pointer group px-2 py-1 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center">
                        <layer.icon className={`h-3.5 w-3.5 mr-2 ${layer.color}`} />
                        {layer.label}
                      </span>
                      <input 
                        type="checkbox" 
                        checked={activeLayers[layer.id]} 
                        onChange={() => toggleLayer(layer.id)} 
                        className="accent-purple-600 w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 focus:ring-purple-500" 
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Verified Feed */}
              <div className="p-3.5 flex flex-col">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center tracking-wide">
                    VERIFIED FEED
                    {usingDemo && <span className="ml-2 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full uppercase">DEMO</span>}
                  </h3>
                </div>

                {/* Filters */}
                <div className="flex gap-1.5 mb-3 overflow-x-auto shrink-0 pb-1 custom-scrollbar">
                  {['All', 'High', 'Medium', 'Low'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors whitespace-nowrap border ${filter === f ? 'bg-purple-600 border-purple-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                
                {/* Feed List */}
                <div className="space-y-2">
                  {filteredIncidents.length === 0 ? (
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No verified reports</p>
                    </div>
                  ) : (
                    filteredIncidents.map(inc => (
                      <div 
                        key={inc.id} 
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${activeIncidentId === inc.id ? 'border-purple-400 bg-purple-50/50 dark:bg-purple-900/10 shadow-sm' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        onClick={() => handleIncidentClick(inc)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${inc.severity === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : inc.severity === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {inc.severity} Severity
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{getTimeAgo(inc.created_at)}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mb-0.5">{inc.type}</h4>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1">{inc.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* CTA Button */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <Button className="w-full font-bold shadow-sm" onClick={() => navigate('/route-planner')}>
                <Navigation className="h-4 w-4 mr-2" /> Plan a Safer Route <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </Card>
          
          {/* RIGHT COLUMN: Geographic Map */}
          <div className="flex flex-col h-[500px] lg:h-full min-h-[500px] lg:min-h-0 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-800">
            <div className="absolute top-3 left-3 right-3 md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-[1000]">
              <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white dark:bg-slate-900/95 backdrop-blur shadow-md rounded-xl p-1.5 border border-slate-200 dark:border-slate-700 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 ml-2 shrink-0" />
                <input 
                  placeholder="Search a location..." 
                  className="w-full bg-transparent border-none p-1 focus:ring-0 text-slate-900 dark:text-slate-100 font-bold placeholder:text-slate-400 dark:text-slate-500 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" disabled={searching} className="p-1.5 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 text-purple-700 rounded-lg shrink-0 transition-colors">
                  {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
                </button>
              </form>
            </div>
            {mapError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 text-center px-4">
                <div className="bg-red-100 p-3 rounded-full mb-4">
                  <MapPin className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Map couldn't be loaded.</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">Please verify your Mapbox access token or check your internet connection.</p>
                <button 
                  onClick={handleRetry}
                  className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full transition-colors flex items-center"
                >
                  <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
                  Retry
                </button>
              </div>
            ) : (
              <MapErrorBoundary>
                <div className="w-full h-full relative" style={{ height: '100%', width: '100%' }}>
                  <MapContainer 
                    center={center} 
                    zoom={14} 
                    scrollWheelZoom={true} 
                    zoomControl={false}
                    className="w-full h-full absolute inset-0"
                    style={{ width: '100%', height: '100%' }}
                  >
                    <div className="leaflet-top leaflet-left mt-16 md:mt-20">
                      <div className="leaflet-control-zoom leaflet-bar leaflet-control">
                        <a className="leaflet-control-zoom-in font-bold text-slate-700 dark:text-slate-300" href="#" title="Zoom in" role="button" aria-label="Zoom in">+</a>
                        <a className="leaflet-control-zoom-out font-bold text-slate-700 dark:text-slate-300" href="#" title="Zoom out" role="button" aria-label="Zoom out">-</a>
                      </div>
                      <div className="leaflet-control mt-2 shadow-sm rounded bg-white dark:bg-slate-900">
                        <button 
                          onClick={(e) => { e.preventDefault(); locateUser(); }} 
                          className="w-[34px] h-[34px] flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 rounded"
                          title="Current Location"
                        >
                          <Navigation className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <TileLayer
                      attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
                      url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`}
                    />
                    
                    <MapUpdater center={center} triggerResize={resizeTrigger} popupInfo={activeIncidentId} />
                    
                    {/* Selected Area Highlight Circle */}
                    <Circle 
                      center={center} 
                      radius={1500} 
                      pathOptions={{ color: 'purple', fillColor: 'purple', fillOpacity: 0.05, weight: 1, dashArray: '5, 5' }} 
                    />

                    {/* Layer: Safe Places */}
                    {activeLayers.safePlaces && DEMO_SAFE_PLACES.map(sp => (
                      <Marker key={sp.id} position={[sp.latitude, sp.longitude]} icon={icons.safePlace}>
                        <Popup className="font-sans border-none shadow-lg rounded-xl overflow-hidden min-w-[200px]">
                          <div className="px-1 py-0.5">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="h-4 w-4 text-blue-500" />
                              <div className="font-bold text-slate-900 dark:text-slate-100">{sp.name}</div>
                            </div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{sp.category} • {sp.distance}</div>
                            <div className="flex items-center gap-1.5 mb-3">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              <span className="text-[10px] font-bold uppercase text-green-700">Open Now</span>
                            </div>
                            <div className="flex gap-2">
                              <button className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold py-1.5 rounded transition-colors" onClick={() => navigate('/places')}>Details</button>
                              <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold py-1.5 rounded transition-colors" onClick={() => navigate(`/route-planner?dest=${encodeURIComponent(sp.name)}`)}>Directions</button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Layer: Lighting Coverage */}
                    {activeLayers.lighting && (
                      <>
                        <Circle center={[center[0] + 0.002, center[1] + 0.008]} radius={200} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15, weight: 1, dashArray: '4' }} >
                          <Popup><div className="font-bold text-sm">Lighting Level: Good</div><div className="text-xs text-slate-500 dark:text-slate-400">Last verified: 2h ago</div></Popup>
                        </Circle>
                        <Circle center={[center[0] - 0.008, center[1] - 0.002]} radius={350} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15, weight: 1, dashArray: '4' }} >
                          <Popup><div className="font-bold text-sm">Lighting Level: Moderate</div><div className="text-xs text-slate-500 dark:text-slate-400">Last verified: 5h ago</div></Popup>
                        </Circle>
                      </>
                    )}

                    {/* Layer: Public Activity */}
                    {activeLayers.activity && (
                      <>
                        <Circle center={[center[0] + 0.005, center[1] - 0.005]} radius={150} pathOptions={{ color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.2, weight: 1 }} >
                          <Popup><div className="font-bold text-sm">Activity Level: High</div><div className="text-xs text-slate-500 dark:text-slate-400">Consistent foot traffic reported</div></Popup>
                        </Circle>
                      </>
                    )}

                    {/* Layer: Live Incidents */}
                    {activeLayers.incidents && filteredIncidents.map(inc => (
                      <Marker 
                        key={inc.id} 
                        position={[inc.latitude, inc.longitude]}
                        icon={inc.severity === 'High' ? icons.high : inc.severity === 'Medium' ? icons.medium : icons.low}
                        eventHandlers={{
                          click: () => setActiveIncidentId(inc.id)
                        }}
                      >
                        <Popup className="font-sans border-none shadow-lg rounded-xl overflow-hidden min-w-[200px]">
                          <div className="px-1 py-0.5">
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">{inc.incident_type}</div>
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${inc.severity === 'High' ? 'bg-red-50 text-red-600' : inc.severity === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                                {inc.severity} Severity
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{getTimeAgo(inc.created_at)}</span>
                            </div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                              Verified Status: Confirmed
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    
                    <div className="leaflet-bottom leaflet-right">
                      <div className="leaflet-control mb-4 mr-4 bg-white dark:bg-slate-900/95 backdrop-blur px-3 py-2.5 rounded-xl shadow-md border border-slate-100 dark:border-slate-800 z-[1000] text-[11px] font-bold text-slate-700 dark:text-slate-300 space-y-1.5 min-w-[130px]">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">Area Safety</p>
                        <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 border border-slate-200 dark:border-slate-700"></div> Lower concern</div>
                        <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2 border border-slate-200 dark:border-slate-700"></div> Moderate concern</div>
                        <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2 border border-slate-200 dark:border-slate-700"></div> Elevated concern</div>
                        <div className="my-1.5 border-t border-slate-100 dark:border-slate-800"></div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">Map Data</p>
                        <div className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-red-500" /> Incident</div>
                        <div className="flex items-center gap-1.5"><Sun className="h-3.5 w-3.5 text-amber-500" /> Lighting</div>
                        <div className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-purple-500" /> Public activity</div>
                        <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-500" /> Safe place</div>
                      </div>
                    </div>
                  </MapContainer>
                </div>
              </MapErrorBoundary>
            )}
            
            {loading && !mapError && (
              <div className="absolute inset-0 bg-white dark:bg-slate-900/60 backdrop-blur-sm z-[2000] flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Loading map data...</p>
              </div>
            )}
          </div>
        
      </div>
    </div>
  );
};
