import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldAlert, MapPin, Camera, AlertTriangle, EyeOff, Activity, Navigation, Upload, CheckCircle, ArrowRight, Crosshair, X, Loader2, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ center, isSelecting, onLocationSelect }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);

  useMapEvents({
    click(e) {
      if (isSelecting) {
        onLocationSelect([e.latlng.lat, e.latlng.lng]);
      }
    }
  });

  return null;
}

const INCIDENT_TYPES = [
  { id: 'Harassment', icon: ShieldAlert },
  { id: 'Poor Lighting', icon: EyeOff },
  { id: 'Suspicious Activity', icon: AlertTriangle },
  { id: 'Theft', icon: AlertTriangle },
  { id: 'Unsafe Area', icon: MapPin },
  { id: 'Other', icon: AlertCircle }
];

const SEVERITIES = [
  { id: 'Low', label: 'Minor incident', color: 'bg-green-100 text-green-700 border-green-200', active: 'ring-green-500 bg-green-50' },
  { id: 'Medium', label: 'Moderate concern', color: 'bg-amber-100 text-amber-700 border-amber-200', active: 'ring-amber-500 bg-amber-50' },
  { id: 'High', label: 'Serious risk', color: 'bg-red-100 text-red-700 border-red-200', active: 'ring-red-500 bg-red-50' }
];

const QUICK_TAGS = ['At night', 'Multiple people', 'Near public transport', 'Recurring issue'];

export const ReportIncident = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  const [step, setStep] = useState('form'); // 'form', 'submitting', 'success', 'error'
  
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('');
  
  const [coords, setCoords] = useState(null); // [lat, lng]
  const [locationName, setLocationName] = useState('');
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [locStatus, setLocStatus] = useState('idle'); // idle, detecting, detected, denied
  
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
    else setSelectedTags([...selectedTags, tag]);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const detectLocation = () => {
    setLocStatus('detecting');
    setIsSelectingOnMap(false);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords([lat, lng]);
          
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data.address) {
              const name = data.address.road || data.address.suburb || data.address.neighbourhood || 'Current Location';
              const city = data.address.city || data.address.town || data.address.county || '';
              const state = data.address.state || '';
              setLocationName(`${name}${city ? ', ' + city : ''}${state ? ', ' + state : ''}`);
            } else {
              setLocationName('Current Location');
            }
          } catch (e) {
            setLocationName('Current Location');
          }
          setLocStatus('detected');
        },
        () => {
          setLocStatus('denied');
          toast.error("Location permission denied. Please select on map.");
        }
      );
    } else {
      setLocStatus('denied');
      toast.error("Geolocation not supported.");
    }
  };

  const handleMapSelect = async (latlng) => {
    setCoords(latlng);
    toast.loading("Getting address...", { id: "map-select" });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng[0]}&lon=${latlng[1]}`);
      const data = await res.json();
      if (data.address) {
        const name = data.address.road || data.address.suburb || data.address.neighbourhood || 'Selected Location';
        setLocationName(name);
      } else {
        setLocationName(`${latlng[0].toFixed(4)}, ${latlng[1].toFixed(4)}`);
      }
      toast.success("Location selected", { id: "map-select" });
      setIsSelectingOnMap(false);
    } catch (e) {
      setLocationName(`${latlng[0].toFixed(4)}, ${latlng[1].toFixed(4)}`);
      toast.success("Location selected", { id: "map-select" });
      setIsSelectingOnMap(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!incidentType) return toast.error("Please select an incident type.");
    if (!severity) return toast.error("Please select a severity level.");
    if (!coords) return toast.error("Please select a location.");
    
    setStep('submitting');
    
    try {
      // If we had real Supabase storage: 
      // let photoUrl = null;
      // if (photoFile) { ... upload logic ... }
      
      // Supabase requires authentication for RLS policies
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        throw new Error("You must be logged in to submit a report.");
      }
      
      const { error } = await supabase
        .from('incidents')
        .insert([
          { 
            user_id: session.user.id,
            incident_type: incidentType, 
            severity: severity, 
            description: description, 
            latitude: coords[0],
            longitude: coords[1],
            location_name: locationName,
            tags: selectedTags,
            photo_url: photoPreview ? 'uploaded_placeholder' : null,
            status: 'Pending'
          }
        ]);
        
      if (error) {
        throw error;
      }
      
      setStep('success');
    } catch (error) {
      console.error(`Incident submission failed:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      setStep('error');
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto mt-12 px-4">
        <Card className="border-green-100 shadow-lg text-center overflow-hidden">
          <div className="bg-green-500 h-2 w-full"></div>
          <CardContent className="p-8 sm:p-12 flex flex-col items-center">
            <div className="bg-green-100 p-4 rounded-full mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">Report Submitted</h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Thank you for helping make routes safer.</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Your report has been submitted for review.</p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Button variant="outline" className="border-slate-200 dark:border-slate-700" onClick={() => navigate('/my-reports')}>
                View My Reports
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => navigate('/safety-map')}>
                Back to Safety Map <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="max-w-xl mx-auto mt-12 px-4">
        <Card className="border-red-100 shadow-lg text-center overflow-hidden">
          <div className="bg-red-500 h-2 w-full"></div>
          <CardContent className="p-8 sm:p-12 flex flex-col items-center">
            <div className="bg-red-100 p-4 rounded-full mb-6">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">Submission Failed</h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Unable to submit your report.</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Please check your connection and try again.</p>
            
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setStep('form')}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">Report an Incident</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">Help make routes safer by reporting what you experienced.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl p-3 sm:p-4 flex items-start gap-3 max-w-sm">
          <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-full shrink-0">
            <ShieldAlert className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight mb-0.5">Your report matters</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Reports are reviewed before being used to improve safety insights.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-x-10">
        
        {/* TOP LEFT COLUMN: FORM PART 1 */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-8 order-1">
          
          {/* 1. WHAT HAPPENED */}
          <section>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1">1. What happened?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Select the category that best describes what you experienced.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {INCIDENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setIncidentType(type.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    incidentType === type.id 
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-700 shadow-sm' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-purple-200 hover:bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <type.icon className={`h-6 w-6 mb-2 ${incidentType === type.id ? 'text-purple-600' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="text-xs sm:text-sm font-bold text-center">{type.id}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 2. SEVERITY */}
          <section>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-4">2. How serious was it?</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SEVERITIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeverity(s.id)}
                  className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
                    severity === s.id 
                      ? `border-transparent ring-2 ${s.active} shadow-sm` 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border mb-2 ${s.color}`}>
                    {s.id}
                  </span>
                  <span className={`text-sm font-bold ${severity === s.id ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* 3. LOCATION */}
          <section>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-4">3. Where did it happen?</h3>
            
            <Card className={`border-2 transition-all ${coords ? 'border-purple-200 bg-purple-50 dark:bg-purple-900/30/30' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full shrink-0 ${coords ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    {coords ? (
                      <>
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{locationName || 'Selected Location'}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</p>
                      </>
                    ) : (
                      <>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">No location selected</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {locStatus === 'denied' ? 'Location permission is unavailable. Select on map.' : 'Please provide a location.'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={detectLocation}
                    disabled={locStatus === 'detecting'}
                    className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-800 text-xs py-1.5 h-auto"
                  >
                    {locStatus === 'detecting' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5 mr-1.5" />} 
                    Use GPS
                  </Button>
                  <Button 
                    variant={isSelectingOnMap ? "default" : "outline"}
                    size="sm" 
                    onClick={() => {
                      setIsSelectingOnMap(!isSelectingOnMap);
                      if (!isSelectingOnMap) toast("Click on the map to set location");
                    }}
                    className={isSelectingOnMap ? "bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 h-auto" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-800 text-xs py-1.5 h-auto"}
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1.5" /> Select on Map
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* RIGHT COLUMN: MAP & CONTEXT */}
        <div className="lg:col-span-5 xl:col-span-5 lg:row-span-2 flex flex-col gap-6 order-2 lg:order-2">
          
          <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative min-h-[350px] lg:min-h-[500px]">
            {(!mapboxToken || mapboxToken === 'YOUR_TOKEN') ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 p-6 text-center">
                <MapPin className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base mb-1">Mapbox Configuration Required</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-[200px]">
                  Please add your VITE_MAPBOX_ACCESS_TOKEN to the .env file.
                </p>
              </div>
            ) : (
              <MapContainer 
                center={coords || [51.505, -0.09]} 
                zoom={14} 
                scrollWheelZoom={true} 
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; Mapbox'
                  url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
                />
                
                {coords && (
                  <Marker position={coords}>
                    <Popup className="font-bold">Incident Location</Popup>
                  </Marker>
                )}
                
                <MapController 
                  center={coords} 
                  isSelecting={isSelectingOnMap} 
                  onLocationSelect={handleMapSelect} 
                />
              </MapContainer>
            )}

            {isSelectingOnMap && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-lg z-[1000] text-sm font-bold animate-pulse">
                Click anywhere on the map to set location
              </div>
            )}
          </div>

          <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm shrink-0">
            <CardHeader className="px-5 py-4 border-b border-slate-50">
              <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Nearby Safety Context</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-md"><EyeOff className="h-4 w-4 text-slate-600 dark:text-slate-400" /></div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Street Lighting</span>
                  </div>
                  <span className="text-sm font-bold text-slate-400 dark:text-slate-500">Data unavailable</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-md"><Activity className="h-4 w-4 text-slate-600 dark:text-slate-400" /></div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Public Activity</span>
                  </div>
                  <span className="text-sm font-bold text-slate-400 dark:text-slate-500">Data unavailable</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-md"><AlertTriangle className="h-4 w-4 text-slate-600 dark:text-slate-400" /></div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Past Incidents</span>
                  </div>
                  <span className="text-sm font-bold text-slate-400 dark:text-slate-500">Data unavailable</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link to="/safety-map" className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center w-max">
                  View Safety Map <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM LEFT COLUMN: FORM PART 2 */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-8 order-3 lg:order-3">
          
          {/* 4. DESCRIPTION */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">4. Tell us more</h3>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{description.length}/500</span>
            </div>
            
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Tell us what happened... (optional)"
              className="w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none shadow-sm"
            />
            
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    selectedTags.includes(tag) 
                      ? 'bg-purple-100 dark:bg-purple-900/50 border-purple-200 text-purple-700' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {selectedTags.includes(tag) && '✓ '}
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* 5. PHOTO */}
          <section>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1">5. Add a photo</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">(Optional) Visual context can be very helpful.</p>
            
            {!photoPreview ? (
              <div 
                className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800 transition-colors p-6 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="bg-white dark:bg-slate-900 p-3 rounded-full inline-flex shadow-sm mb-3">
                  <Camera className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Click to upload photo</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PNG, JPG up to 5MB</p>
              </div>
            ) : (
              <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-slate-900/60 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors backdrop-blur-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </section>

          {/* SUBMIT */}
          <section className="pt-4 border-t border-slate-100 dark:border-slate-800 pb-12 lg:pb-0">
            <Button 
              onClick={handleSubmit} 
              disabled={step === 'submitting'}
              className="w-full text-lg py-7 rounded-2xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 transition-all"
            >
              {step === 'submitting' ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <>Submit Report <ArrowRight className="h-5 w-5 ml-2" /></>
              )}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
};
