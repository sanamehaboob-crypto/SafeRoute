import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MapPin, Navigation, ArrowDownUp, Search, CheckCircle, Shield, Zap, ArrowLeft, Loader2, Map as MapIcon, Crosshair } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import toast from 'react-hot-toast';
import { geocode, getRoutes } from '../services/mapService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ originCoords, destinationCoords, routes }) {
  const map = useMap();
  useEffect(() => {
    if (routes && routes.length > 0) {
      const bounds = L.latLngBounds();
      routes.forEach(route => {
        route.geometry.coordinates.forEach(coord => {
          bounds.extend([coord[1], coord[0]]);
        });
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
      map.setView([originCoords[1], originCoords[0]], 14);
    }
  }, [routes, originCoords, destinationCoords, map]);
  return null;
}

function MapClickListener({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export const RoutePlanner = () => {
  const location = useLocation();
  const locationState = location.state || {};
  
  const [searchParams] = useSearchParams();
  const destQuery = searchParams.get('dest') || '';
  
  const [step, setStep] = useState(1); // 1: Location/Dest, 2: Preference, 3: Finding, 4: Results
  
  // Location States
  const [locStatus, setLocStatus] = useState(locationState.originCoords ? 'manual' : 'detecting');
  const [originName, setOriginName] = useState(locationState.originName || 'Detecting location...');
  const [originAddress, setOriginAddress] = useState(locationState.originCoords ? '' : 'Please wait');
  const [originCoords, setOriginCoords] = useState(locationState.originCoords || null); // [lng, lat]
  const [isManualOrigin, setIsManualOrigin] = useState(!!locationState.originCoords);
  
  const [destinationName, setDestinationName] = useState(locationState.destinationName || destQuery);
  const [destinationCoords, setDestinationCoords] = useState(locationState.destCoords || null); // [lng, lat]
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  
  const [preference, setPreference] = useState('safest'); // safest, balanced, fastest
  const [routes, setRoutes] = useState([]);
  const [recommendedRouteId, setRecommendedRouteId] = useState(null);
  
  const navigate = useNavigate();

  const detectLocation = () => {
    setLocStatus('detecting');
    setOriginName('Detecting location...');
    setOriginAddress('Using GPS to find you');
    setIsManualOrigin(false);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setOriginCoords([lng, lat]);
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              if (data.address) {
                const name = data.address.road || data.address.suburb || data.address.neighbourhood || 'Current Location';
                const city = data.address.city || data.address.town || data.address.county || '';
                const state = data.address.state || '';
                setOriginName(name);
                setOriginAddress(`${city}${city && state ? ', ' : ''}${state}`);
              } else {
                setOriginName('Current Location');
                setOriginAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
              }
              setLocStatus('detected');
            })
            .catch(() => {
              setOriginName('Current Location');
              setOriginAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
              setLocStatus('detected');
            });
        },
        (error) => {
          setLocStatus('denied');
          setOriginName('Location Unavailable');
          setOriginAddress('Please enter location manually');
          setIsManualOrigin(true);
          toast.error("Could not fetch location. Enter manually.");
        }
      );
    } else {
      setLocStatus('error');
      setOriginName('Not Supported');
      setOriginAddress('Geolocation not supported');
      setIsManualOrigin(true);
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const handleSwap = () => {
    const tempName = originName;
    const tempCoords = originCoords;
    
    setOriginName(destinationName);
    setOriginCoords(destinationCoords);
    setOriginAddress('Swapped location');
    setIsManualOrigin(true);
    
    setDestinationName(tempName);
    setDestinationCoords(tempCoords);
  };

  const handleContinueToPref = () => {
    if (!originName.trim()) return toast.error("Please provide a starting location.");
    if (!destinationName.trim()) return toast.error("Please provide a destination.");
    setStep(2);
  };

  const handleFindRoutes = async () => {
    setStep(3);
    setRoutes([]);
    
    try {
      // Resolve origin if it's manual text
      let finalOriginCoords = originCoords;
      if (!finalOriginCoords || isManualOrigin) {
        toast.loading("Geocoding origin...", { id: "routing" });
        const originRes = await geocode(originName);
        if (originRes.length === 0) throw new Error("Origin not found. Please try a different search.");
        finalOriginCoords = originRes[0].center;
        setOriginCoords(finalOriginCoords);
      }
      
      // Resolve destination if we don't have coords
      let finalDestCoords = destinationCoords;
      if (!finalDestCoords) {
        toast.loading("Geocoding destination...", { id: "routing" });
        // Use origin coordinates as proximity to keep results localized
        const destRes = await geocode(destinationName, finalOriginCoords);
        if (destRes.length === 0) throw new Error("Destination not found. Please try a different search.");
        finalDestCoords = destRes[0].center;
        setDestinationCoords(finalDestCoords);
      }
      
      // Validate coordinates
      const isValidCoord = (c) => Array.isArray(c) && c.length === 2 && !isNaN(c[0]) && !isNaN(c[1]) && 
                                  c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90;
      
      if (!isValidCoord(finalOriginCoords)) throw new Error("Invalid origin coordinates resolved.");
      if (!isValidCoord(finalDestCoords)) throw new Error("Invalid destination coordinates resolved.");
      
      console.log(`Routing from Origin: [${finalOriginCoords}] to Destination: [${finalDestCoords}]`);
      
      toast.loading("Calculating safer routes...", { id: "routing" });
      const foundRoutes = await getRoutes(finalOriginCoords, finalDestCoords);
      
      if (!foundRoutes || foundRoutes.length === 0) {
        throw new Error("No routes found between these locations.");
      }
      
      // Sort based on preference
      let sortedRoutes = [...foundRoutes];
      if (preference === 'safest') {
        sortedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
      } else if (preference === 'fastest') {
        sortedRoutes.sort((a, b) => {
          const durA = parseInt(a.duration) || 0;
          const durB = parseInt(b.duration) || 0;
          return durA - durB;
        });
      }
      // 'balanced' just uses default Mapbox sorting, which is usually fastest/optimal
      
      setRoutes(sortedRoutes);
      setRecommendedRouteId(sortedRoutes[0].id);
      toast.success("Routes found!", { id: "routing" });
      setStep(4);
      
    } catch (error) {
      console.error(error);
      setStep(2); // Go back to preference on error
      if (error.message.includes("API key is required")) {
        toast.error("Mapbox API Key is missing. Please configure it.", { id: "routing" });
      } else {
        toast.error(error.message || "Failed to find routes. Check your connection.", { id: "routing" });
      }
    }
  };

  const handleMapClick = async (latlng) => {
    if (!isSelectingOnMap) return;
    
    toast.loading("Getting address...", { id: "map-select" });
    setDestinationCoords([latlng.lng, latlng.lat]);
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
      const data = await res.json();
      if (data.address) {
        const name = data.address.road || data.address.suburb || data.address.neighbourhood || 'Selected Location';
        setDestinationName(name);
      } else {
        setDestinationName(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      }
      toast.success("Destination selected", { id: "map-select" });
      setIsSelectingOnMap(false);
    } catch (e) {
      setDestinationName(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      toast.success("Destination coordinates saved", { id: "map-select" });
      setIsSelectingOnMap(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-64px)] flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => {
            if (step > 1 && step < 4) setStep(step - 1);
            else if (step === 4) setStep(2);
            else navigate(-1);
          }}
          className="text-slate-500 dark:text-slate-400 hover:text-purple-600 transition-colors flex items-center font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Plan a Safer Route</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Choose your destination and route preference.</p>
        </div>
      </div>

      {/* PROGRESS INDICATOR */}
      <div className="flex items-center gap-2 sm:gap-4 mb-6 px-1">
        {[
          { num: 1, label: 'Location' },
          { num: 2, label: 'Preference' },
          { num: 3, label: 'Finding' },
          { num: 4, label: 'Routes' }
        ].map((s) => (
          <div key={s.num} className={`flex items-center gap-2 ${step >= s.num ? 'opacity-100' : 'opacity-40 grayscale'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s.num ? 'bg-purple-600 text-white shadow-md' : (step > s.num ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400')}`}>
              {step > s.num ? <CheckCircle className="h-3 w-3" /> : s.num}
            </div>
            <span className={`text-xs font-bold hidden sm:block ${step === s.num ? 'text-purple-700' : 'text-slate-500 dark:text-slate-400'}`}>{s.label}</span>
            {s.num < 4 && <div className="w-4 sm:w-8 h-px bg-slate-200 dark:bg-slate-700 mx-1 sm:mx-2" />}
          </div>
        ))}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1 min-h-0">
        
        {/* LEFT COLUMN - FORM / RESULTS */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col min-h-0 overflow-y-auto pr-2 pb-8">
          
          {/* STEP 1: LOCATION & DESTINATION */}
          {step === 1 && (
            <div className="space-y-6">
              {/* CURRENT LOCATION */}
              <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider">Your current location</h3>
                    {locStatus === 'detected' && !isManualOrigin && (
                      <span className="text-xs font-bold text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div> Detected
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-full shrink-0">
                      <MapPin className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      {isManualOrigin ? (
                        <input 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 font-bold placeholder:text-slate-400 dark:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Search starting location..."
                          value={originName === 'Detecting location...' ? '' : originName}
                          onChange={(e) => { setOriginName(e.target.value); setOriginCoords(null); }}
                          autoFocus
                        />
                      ) : (
                        <>
                          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">{originName}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{originAddress}</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-3">
                    {!isManualOrigin ? (
                      <button 
                        onClick={() => setIsManualOrigin(true)}
                        className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-purple-700 transition-colors flex items-center bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:bg-purple-900/30 px-3 py-2 rounded-lg"
                      >
                        <Search className="h-3.5 w-3.5 mr-1.5" /> Change Location
                      </button>
                    ) : (
                      <button 
                        onClick={detectLocation}
                        className="text-xs font-bold text-purple-700 transition-colors flex items-center bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 px-3 py-2 rounded-lg"
                      >
                        <Crosshair className="h-3.5 w-3.5 mr-1.5" /> Use My Location
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* SWAP BUTTON */}
              <div className="flex justify-center -my-2 relative z-10">
                <button 
                  onClick={handleSwap}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-purple-600 transition-all hover:rotate-180"
                  title="Swap locations"
                >
                  <ArrowDownUp className="h-4 w-4" />
                </button>
              </div>

              {/* DESTINATION */}
              <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider mb-4">Where do you want to go?</h3>
                  
                  <div className="flex gap-4 items-start">
                    <div className="bg-red-50 p-3 rounded-full shrink-0">
                      <MapPin className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <div className="relative">
                          <Input 
                            placeholder="Search for a destination..." 
                            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:ring-purple-500 py-6"
                            value={destinationName}
                            onChange={async (e) => { 
                              setDestinationName(e.target.value); 
                              setDestinationCoords(null);
                              if (e.target.value.length > 2) {
                                try {
                                  const res = await geocode(e.target.value, originCoords);
                                  setSearchSuggestions(res.slice(0, 5));
                                } catch (err) {}
                              } else {
                                setSearchSuggestions([]);
                              }
                            }}
                          />
                          <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          
                          {searchSuggestions && searchSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              {searchSuggestions.map((sug, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 flex flex-col"
                                  onClick={() => {
                                    setDestinationName(sug.name);
                                    setDestinationCoords(sug.center);
                                    setSearchSuggestions([]);
                                  }}
                                >
                                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate w-full">{sug.name.split(',')[0]}</span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">{sug.name.split(',').slice(1).join(',')}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-3">
                    <button 
                      onClick={() => {
                        setIsSelectingOnMap(!isSelectingOnMap);
                        if (!isSelectingOnMap) toast("Click anywhere on the map to select destination", { icon: "🗺️" });
                      }}
                      className={`text-xs font-bold transition-colors flex items-center px-3 py-2 rounded-lg ${isSelectingOnMap ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <MapIcon className="h-3.5 w-3.5 mr-1.5" /> {isSelectingOnMap ? 'Selecting on Map...' : 'Select on Map'}
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* CONTINUE BUTTON */}
              <Button 
                onClick={handleContinueToPref}
                className="w-full text-lg py-7 rounded-2xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 transition-all mt-4"
              >
                Continue <ArrowLeft className="h-5 w-5 ml-2 rotate-180" />
              </Button>
            </div>
          )}

          {/* STEP 2: PREFERENCE */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="mb-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">How would you like to travel?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Select the routing strategy that fits your needs.</p>
              </div>

              <div className="space-y-4">
                {/* SAFEST */}
                <Card 
                  className={`cursor-pointer border-2 transition-all rounded-2xl ${preference === 'safest' ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 bg-white dark:bg-slate-900'}`}
                  onClick={() => setPreference('safest')}
                >
                  <CardContent className="p-5 flex gap-4 items-start relative overflow-hidden">
                    {preference === 'safest' && <div className="absolute top-0 right-0 w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-bl-full -z-0"></div>}
                    <div className={`p-3 rounded-full shrink-0 relative z-10 ${preference === 'safest' ? 'bg-purple-200 text-purple-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      <Shield className="h-6 w-6" />
                    </div>
                    <div className="relative z-10 flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Safest</h4>
                        <span className="text-[10px] uppercase font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full tracking-wider">Recommended</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Prioritize safer areas even if the journey takes longer.</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center h-full relative z-10">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${preference === 'safest' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-700'}`}>
                        {preference === 'safest' && <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full"></div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* BALANCED */}
                <Card 
                  className={`cursor-pointer border-2 transition-all rounded-2xl ${preference === 'balanced' ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 bg-white dark:bg-slate-900'}`}
                  onClick={() => setPreference('balanced')}
                >
                  <CardContent className="p-5 flex gap-4 items-start relative">
                    <div className={`p-3 rounded-full shrink-0 relative z-10 ${preference === 'balanced' ? 'bg-purple-200 text-purple-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      <Navigation className="h-6 w-6" />
                    </div>
                    <div className="relative z-10 flex-1">
                      <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg mb-1">Balanced</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Balance safety and travel time.</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center h-full relative z-10">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${preference === 'balanced' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-700'}`}>
                        {preference === 'balanced' && <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full"></div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* FASTEST */}
                <Card 
                  className={`cursor-pointer border-2 transition-all rounded-2xl ${preference === 'fastest' ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 bg-white dark:bg-slate-900'}`}
                  onClick={() => setPreference('fastest')}
                >
                  <CardContent className="p-5 flex gap-4 items-start relative">
                    <div className={`p-3 rounded-full shrink-0 relative z-10 ${preference === 'fastest' ? 'bg-purple-200 text-purple-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="relative z-10 flex-1">
                      <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg mb-1">Fastest</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Prioritize shorter travel time while considering risk.</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center h-full relative z-10">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${preference === 'fastest' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-700'}`}>
                        {preference === 'fastest' && <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full"></div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* FIND ROUTES BUTTON */}
              <Button 
                onClick={handleFindRoutes}
                className="w-full text-lg py-7 rounded-2xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 transition-all mt-4"
              >
                <Search className="h-5 w-5 mr-2" /> Find Routes
              </Button>
            </div>
          )}

          {/* STEP 3: LOADING */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in duration-500">
              <div className="bg-purple-100 dark:bg-purple-900/50 p-6 rounded-full relative">
                <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                <Shield className="h-5 w-5 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-2xl mb-2">Finding safer routes...</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm max-w-xs mx-auto">
                  Comparing available routes using real-time safety information and environmental data.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: ROUTES */}
          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-bottom-8 duration-500">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xl mb-4">Available Routes</h3>
              {routes.map(route => {
                const isRec = route.id === recommendedRouteId;
                return (
                  <Card key={route.id} className={`rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${isRec ? "border-green-500 border-2 shadow-green-100" : "border-slate-100 dark:border-slate-800"}`}>
                    <CardContent className="p-5 relative">
                      {isRec && <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full z-0"></div>}
                      
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isRec && <CheckCircle className="h-4 w-4 text-green-600" />}
                            <h4 className={`font-extrabold text-base ${isRec ? 'text-green-700' : 'text-slate-900 dark:text-slate-100'}`}>
                              {isRec ? 'Recommended Route' : 'Alternative Route'}
                            </h4>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">{route.distance} • {route.duration}</p>
                        </div>
                        <Badge variant={route.safetyScore >= 80 ? 'safe' : (route.safetyScore >= 60 ? 'warning' : 'danger')} className="text-xs px-2 py-1">
                          Safety: {route.safetyScore}/100
                        </Badge>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-medium text-slate-600 dark:text-slate-400 relative z-10">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div className={`w-2 h-2 rounded-full ${route.lightingScore >= 80 ? 'bg-green-500' : 'bg-amber-500'}`} />
                          Lighting: {route.lightingScore}
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div className={`w-2 h-2 rounded-full ${route.activityScore >= 80 ? 'bg-green-500' : 'bg-amber-500'}`} />
                          Activity: {route.activityScore}
                        </div>
                      </div>
                      
                      <div className="mt-5 relative z-10">
                        <Button 
                          className={`w-full py-5 rounded-xl font-bold ${isRec ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800"}`} 
                          onClick={() => navigate(`/route/${route.id}`, { state: { route, originCoords, destinationCoords, originName, destinationName } })}
                        >
                          View Details <ArrowLeft className="h-4 w-4 ml-1.5 rotate-180" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - MAP */}
        <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative z-0 min-h-[400px]">
          {(!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN === 'YOUR_TOKEN') ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 p-6 text-center">
              <Shield className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg mb-2">Mapbox Configuration Required</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                Please add your <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">VITE_MAPBOX_ACCESS_TOKEN</code> to the <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">.env</code> file to enable the interactive map.
              </p>
            </div>
          ) : (
            <>
              <MapContainer center={originCoords ? [originCoords[1], originCoords[0]] : [51.505, -0.09]} zoom={13} scrollWheelZoom={true} className="w-full h-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
                  url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`}
                />
                {originCoords && (
                  <Marker position={[originCoords[1], originCoords[0]]}>
                    <Popup className="font-bold">Origin</Popup>
                  </Marker>
                )}
                {destinationCoords && (
                  <Marker position={[destinationCoords[1], destinationCoords[0]]}>
                    <Popup className="font-bold">Destination</Popup>
                  </Marker>
                )}
                
                {routes.map(route => (
                  <Polyline
                    key={route.id}
                    positions={route.geometry.coordinates.map(c => [c[1], c[0]])}
                    color={route.id === recommendedRouteId ? '#9333ea' : '#94a3b8'} // SafeRoute purple for recommended
                    weight={route.id === recommendedRouteId ? 6 : 4}
                    opacity={route.id === recommendedRouteId ? 1 : 0.6}
                  />
                ))}
                
                <MapUpdater originCoords={originCoords} destinationCoords={destinationCoords} routes={routes} />
                <MapClickListener onMapClick={handleMapClick} />
              </MapContainer>
              
              {isSelectingOnMap && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-lg z-[1000] text-sm font-bold animate-bounce">
                  Click anywhere on the map to set destination
                </div>
              )}
            </>
          )}
        </div>
        
      </div>
    </div>
  );
};
