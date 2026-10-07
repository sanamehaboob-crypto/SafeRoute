import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Search, Navigation, AlertTriangle, 
  Crosshair, User, Bell, Settings, Bookmark, Clock, ChevronRight,
  ShieldAlert, ShieldCheck, BarChart2, Users, Target, ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import heroIllustration from '../assets/hero-illustration.jpg';

export const Home = () => {
  const navigate = useNavigate();
  
  // Location states: 'detecting', 'detected', 'denied', 'error', 'manual'
  const [locationState, setLocationState] = useState('detecting');
  const [locationName, setLocationName] = useState('Detecting location...');
  const [locationAddress, setLocationAddress] = useState('Please wait');
  const [destination, setDestination] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  
  const detectLocation = () => {
    setLocationState('detecting');
    setLocationName('Detecting location...');
    setLocationAddress('Using GPS to find you');
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              if (data.address) {
                const name = data.address.road || data.address.suburb || data.address.neighbourhood || 'Current Location';
                const city = data.address.city || data.address.town || data.address.county || '';
                const state = data.address.state || '';
                setLocationName(name);
                setLocationAddress(`${city}${city && state ? ', ' : ''}${state}`);
              } else {
                setLocationName('Current Location');
                setLocationAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
              }
              setLocationState('detected');
            })
            .catch(() => {
              setLocationName('Current Location');
              setLocationAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
              setLocationState('detected');
            });
        },
        (error) => {
          console.error(error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationState('denied');
            setLocationName('Permission Denied');
            setLocationAddress('Location access blocked');
            toast.error("Please enable location permissions or enter manually.");
          } else {
            setLocationState('error');
            setLocationName('Location Unavailable');
            setLocationAddress('Could not detect GPS');
            toast.error("Could not fetch location.");
          }
        }
      );
    } else {
      setLocationState('error');
      setLocationName('Not Supported');
      setLocationAddress('Geolocation not supported');
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const handlePlanRoute = () => {
    if (locationState === 'detecting') {
      toast.error('Still detecting location. Please wait.');
      return;
    }
    
    if ((locationState === 'denied' || locationState === 'error') && !locationName.trim()) {
      toast.error('Please enter a valid starting location');
      return;
    }
    
    if (!destination.trim()) {
      toast.error('Please enter a destination');
      return;
    }

    setIsRouting(true);
    setTimeout(() => {
      setIsRouting(false);
      navigate(`/route-planner?dest=${encodeURIComponent(destination)}`);
    }, 600);
  };

  const quickActions = [
    { title: 'Safety Map', desc: 'View safety information around you', icon: MapPin, route: '/safety-map', color: 'purple', arrowColor: 'text-purple-600 bg-purple-100 dark:bg-purple-900/50' },
    { title: 'Report Incident', desc: 'Report an unsafe situation', icon: ShieldAlert, route: '/report-incident', color: 'red', arrowColor: 'text-red-600 bg-red-100' },
    { title: 'My Trips', desc: 'View your previous journeys', icon: Navigation, route: '/my-reports', color: 'blue', arrowColor: 'text-blue-600 bg-blue-100' },
    { title: 'Profile', desc: 'Manage your account and preferences', icon: User, route: '/settings', color: 'green', arrowColor: 'text-green-600 bg-green-100' },
  ];

  const moreOptions = [
    { title: 'Notifications', status: 'Manage alerts', icon: Bell, route: '/notifications', statusColor: 'text-slate-500 dark:text-slate-400' },
    { title: 'Saved Places', status: 'Manage locations', icon: Bookmark, route: '/places', statusColor: 'text-slate-500 dark:text-slate-400' },
    { title: 'Emergency History', status: 'View past alerts', icon: Clock, route: '/emergency-history', statusColor: 'text-slate-500 dark:text-slate-400' },
    { title: 'Settings', status: 'App preferences', icon: Settings, route: '/settings', statusColor: 'text-slate-500 dark:text-slate-400' },
  ];

  const getColorClasses = (color) => {
    switch(color) {
      case 'purple': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/50';
      case 'red': return 'text-red-600 bg-red-100';
      case 'blue': return 'text-blue-600 bg-blue-100';
      case 'green': return 'text-green-600 bg-green-100';
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10 pb-20 font-sans">
      
      {/* HERO SECTION */}
      <section className="relative bg-[#f8f6fe] rounded-[2rem] p-8 lg:p-12 border border-purple-100/50 overflow-hidden flex flex-col lg:flex-row items-center gap-8 shadow-sm">
        
        {/* LEFT COLUMN: Text + Route Planner */}
        <div className="z-10 w-full lg:w-[60%] xl:w-[62%] shrink-0 space-y-6">
          <div className="space-y-3">
            <span className="inline-block bg-purple-100 dark:bg-purple-900/50 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
              Women's Safety Route Planner
            </span>
            <h1 className="text-4xl lg:text-5xl xl:text-[3.5rem] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]">
              Stay safer.<br className="hidden sm:block" />{' '}
              <span className="text-purple-600 whitespace-nowrap">Travel smarter.</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl font-medium pt-1">
              Plan your journey with safety information at every step.
            </p>
          </div>

          {/* ROUTE PLANNER CARD */}
          <Card className="border border-white shadow-xl shadow-purple-900/5 rounded-2xl bg-white dark:bg-slate-900/95 backdrop-blur overflow-hidden mt-6 w-full">
            <CardContent className="p-4 sm:p-6 lg:p-8 space-y-5">
              <div className="flex flex-col md:flex-row gap-5 lg:gap-8">
                
                {/* Current Location Field */}
                <div className="w-full md:w-[48%] relative group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Your current location</span>
                    {locationState === 'detected' && (
                      <span className="text-xs font-bold text-green-600 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div> Detected
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 dark:bg-purple-900/50 p-2.5 rounded-full shrink-0 mt-0.5">
                      <MapPin className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      {locationState === 'manual' ? (
                        <input 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-bold placeholder:text-slate-400 dark:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter starting location"
                          value={locationName === 'Detecting location...' || locationName === 'Permission Denied' || locationName === 'Location Unavailable' ? '' : locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <>
                          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base truncate">{locationName}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">{locationAddress}</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="absolute right-0 bottom-1">
                     {locationState !== 'detecting' && (
                      <button 
                        onClick={() => locationState === 'manual' ? detectLocation() : setLocationState('manual')}
                        className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center bg-purple-50 dark:bg-purple-900/30 border border-purple-100 px-3 py-1.5 rounded-full shadow-sm"
                      >
                        <Target className="h-3 w-3 mr-1" /> {locationState === 'manual' ? 'Use GPS' : 'Change'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Divider Line */}
                <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-700/60 my-2"></div>

                {/* Destination Field */}
                <div className="w-full md:w-[52%] relative group">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-3 whitespace-nowrap">Where do you want to go?</span>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all shadow-sm">
                    <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <input 
                      placeholder="Search destination..." 
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-900 dark:text-slate-100 font-bold placeholder:text-slate-400 dark:text-slate-500 text-sm sm:text-base"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                    <Crosshair className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0 hover:text-purple-600 cursor-pointer" />
                  </div>
                </div>
              </div>

              {/* Plan Route Button */}
              <Button 
                className="w-full text-lg py-7 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 transition-all mt-4"
                onClick={handlePlanRoute}
                disabled={isRouting}
              >
                {isRouting ? (
                  <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div> Loading...</>
                ) : (
                  <>
                    <Navigation className="h-5 w-5 mr-2 -ml-2" /> Plan Safe Route <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Illustration */}
        <div className="hidden lg:flex lg:w-[40%] xl:w-[38%] shrink-0 relative items-center justify-center min-h-[420px]">
          <img 
            src={heroIllustration} 
            alt="Confident woman walking safely" 
            className="w-full max-w-[480px] object-contain mix-blend-multiply z-10 xl:translate-x-4"
          />
          
          {/* Floating Badges */}
          <div className="absolute top-8 right-2 xl:-right-4 bg-white dark:bg-slate-900 py-2 px-3.5 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3 z-20 hover:-translate-y-1 transition-transform">
            <div className="bg-green-100 p-1.5 rounded-lg"><ShieldCheck className="h-4 w-4 text-green-600" /></div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">Safer Routes</div>
            </div>
          </div>
          
          <div className="absolute top-1/2 -right-2 xl:-right-8 bg-white dark:bg-slate-900 py-2 px-3.5 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3 z-20 hover:-translate-y-1 transition-transform translate-y-4">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-lg"><BarChart2 className="h-4 w-4 text-purple-600" /></div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight whitespace-nowrap">Real-time Safety Data</div>
            </div>
          </div>
          
          <div className="absolute bottom-16 left-4 xl:left-8 bg-white dark:bg-slate-900 py-2 px-3.5 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3 z-20 hover:-translate-y-1 transition-transform">
            <div className="bg-blue-100 p-1.5 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">A Safer You</div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS & SAFETY AROUND YOU */}
      <section className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-stretch">
        
        {/* Left: Quick Actions (70%) */}
        <div className="w-full xl:w-[70%] flex flex-col">
          <div className="flex items-end justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Quick Actions</h2>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Everything you need for a safer journey.</span>
            </div>
            <button 
              className="hidden sm:flex text-sm font-bold text-purple-600 hover:text-purple-800 items-center"
              onClick={() => navigate('/settings')}
            >
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            {quickActions.map((action, idx) => (
              <button 
                key={idx}
                onClick={() => navigate(action.route)}
                className="flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-200 dark:border-slate-700 hover:-translate-y-0.5 transition-all text-left group relative h-full min-h-[200px]"
              >
                <div className={`p-3 rounded-full w-fit mb-4 ${getColorClasses(action.color)}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base mb-1">{action.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 pr-2 leading-relaxed">{action.desc}</p>
                
                <div className={`absolute bottom-5 right-5 h-8 w-8 rounded-full flex items-center justify-center ${action.arrowColor}`}>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Safety Around You (30%) */}
        <div className="w-full xl:w-[30%] flex flex-col mt-2 xl:mt-0">
          <div className="mb-4 px-1">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Safety Around You</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate">Explore safety information in your area.</p>
          </div>
          
          <Card 
            className="flex-1 min-h-[200px] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm relative group p-0 bg-white dark:bg-slate-900 cursor-pointer hover:border-purple-200 transition-colors"
            onClick={() => navigate('/safety-map')}
          >
            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-800/50 z-0 opacity-80 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDQwaDQwVjBIMHptMjAtMjB2MjBIMFYyMHptMC0yMGgyMHYyMEgyMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UxZTFlNiIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')]"></div>
            
            {/* Fake pins for visual map effect */}
            <MapPin className="absolute top-8 left-6 text-red-500 h-5 w-5 z-0 fill-white" />
            <MapPin className="absolute bottom-10 left-16 text-purple-500 h-5 w-5 z-0 fill-white" />
            <MapPin className="absolute top-12 right-24 text-amber-500 h-5 w-5 z-0 fill-white" />
            <MapPin className="absolute bottom-12 right-32 text-blue-500 h-5 w-5 z-0 fill-white" />
            <MapPin className="absolute top-6 right-12 text-green-500 h-5 w-5 z-0 fill-white" />
            
            {/* Safety Legend */}
            <div className="absolute top-3 right-3 bg-white dark:bg-slate-900/95 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 z-10 text-xs font-medium text-slate-600 dark:text-slate-400 space-y-2">
              <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2"></div> Safer areas</div>
              <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></div> Moderate risk</div>
              <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></div> Higher risk</div>
              <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-purple-50 dark:bg-purple-900/300 mr-2"></div> Lighting</div>
              <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2"></div> Public activity</div>
            </div>

            <Button 
              className="absolute bottom-3 right-3 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 text-purple-700 border-none font-bold shadow-sm z-10 rounded-full px-4 text-xs h-8"
              onClick={() => navigate('/safety-map')}
            >
              Open Safety Map <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </Card>
        </div>
      </section>

      {/* MORE OPTIONS */}
      <section>
        <div className="flex items-center gap-3 mb-4 px-1">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">More Options</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Additional tools and settings.</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {moreOptions.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => navigate(item.route)}
              className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-full text-purple-600 group-hover:bg-purple-100 dark:bg-purple-900/50 transition-colors">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mb-0.5">{item.title}</h4>
                  <p className={`text-xs ${item.statusColor}`}>{item.status}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-purple-400 transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* SOS SECTION */}
      <section>
        <Card className="bg-red-50/80 border-red-100 shadow-sm rounded-3xl overflow-hidden transition-shadow hover:shadow-md">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 md:gap-6">
              <div className="bg-red-100/80 p-4 rounded-full shrink-0 border border-red-200 shadow-sm">
                <ShieldAlert className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xl lg:text-2xl mb-1.5">Feeling unsafe?</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm lg:text-base max-w-xl">
                  Get help from your emergency contacts and share your current location.
                </p>
                <p className="text-red-600/80 font-bold text-xs mt-2 uppercase tracking-wider">
                  Your safety comes first.
                </p>
              </div>
            </div>
            <Button 
              variant="danger" 
              className="rounded-2xl px-12 py-6 font-black shadow-lg shadow-red-200/50 text-xl hover:-translate-y-1 transition-all shrink-0 w-full md:w-auto bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-4 focus:ring-red-200 focus:ring-offset-2 flex items-center justify-center gap-2" 
              onClick={() => navigate('/emergency-sos')}
            >
              <AlertTriangle className="h-6 w-6" /> SOS
            </Button>
          </CardContent>
        </Card>
      </section>

    </div>
  );
};
