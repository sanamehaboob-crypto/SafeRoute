import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, PhoneCall, AlertTriangle, MapPin, X, Users, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

export const EmergencySOS = () => {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [locationStr, setLocationStr] = useState('Fetching location...');
  const [coordinates, setCoordinates] = useState(null);
  const [shareLocation, setShareLocation] = useState(false);
  const [activeSosId, setActiveSosId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState(null);
  
  const watchIdRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setShareLocation(parsed.locationTracking && parsed.shareLocationWithContacts);
      }
    } catch (e) {}

    // We can still try to pre-warm the location, but we won't rely on it for the SOS action.
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocationStr(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        err => setLocationStr('Location unavailable')
      );
    }
    
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const getFreshLocation = () => {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Must be fresh
      );
    });
  };

  const handleActivate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    toast.dismiss(); // Clear any existing toasts
    
    // STEP 1 & 2: Request fresh GPS
    let freshCoords = null;
    toast.loading("Getting your current location...", { id: 'sos-status' });
    try {
      freshCoords = await getFreshLocation();
      setCoordinates(freshCoords);
      setLocationStr(`${freshCoords.lat.toFixed(4)}, ${freshCoords.lng.toFixed(4)}`);
    } catch (err) {
      console.error("SOS Location Error:", err);
      toast.error("Location permission is required to send an SOS with your current location.", { id: 'sos-status' });
      setIsProcessing(false);
      return; // STOP ENTIRE FLOW
    }

    toast.loading("Sending emergency alert...", { id: 'sos-status' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to trigger SOS.", { id: 'sos-status' });
        setIsProcessing(false);
        return;
      }

      // Fetch user profile for name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const userName = profile?.full_name || 'A SafeRoute user';

      // Fetch emergency contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id);

      if (contactsError) throw contactsError;

      // Create SOS Session
      const { data: sosData, error: sosError } = await supabase
        .from('sos_sessions')
        .insert([{
          user_id: user.id,
          status: 'Active',
          start_time: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (sosError) throw sosError;
      
      setActiveSosId(sosData.id);

      // Insert fresh location update
      const { error: locError } = await supabase
        .from('sos_location_updates')
        .insert([{
          sos_id: sosData.id,
          latitude: freshCoords.lat,
          longitude: freshCoords.lng,
          timestamp: new Date().toISOString()
        }]);
      if (locError) console.error("Failed to save SOS location", locError);

      // Call WhatsApp Backend
      let waStatus = { delivered: 0, failed: 0 };
      if (!contacts || contacts.length === 0) {
        toast.error("No emergency contacts are configured.", { id: 'sos-status' });
      } else {
        try {
          const res = await fetch('/api/sos/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contacts, 
              lat: freshCoords.lat, 
              lng: freshCoords.lng,
              userName: userName
            })
          });
          const result = await res.json();
          if (res.ok) {
            waStatus.delivered = result.delivered_count || 0;
            waStatus.failed = result.failed_count || 0;
            
            toast.dismiss('sos-status'); // Clean the UI of loading states

            if (waStatus.delivered > 0) {
              if (user) {
                supabase.from('notifications').insert([{
                  user_id: user.id,
                  type: 'info',
                  title: 'WhatsApp Emergency Alert Sent',
                  message: 'Your emergency alert was successfully sent to your emergency contact(s).',
                  created_at: new Date().toISOString(),
                  read: false
                }]).catch(e => console.error(e));
              }
            } else {
              // Parse specific Meta errors from backend
              const errObj = result.failed && result.failed[0] ? result.failed[0].error : "";
              if (errObj && errObj.includes("132001")) {
                if (user) {
                  supabase.from('notifications').insert([{
                    user_id: user.id,
                    type: 'alert',
                    title: 'WhatsApp Emergency Alert Unavailable',
                    message: 'The WhatsApp emergency alert could not be sent because the Meta emergency template is not yet approved for sending.',
                    created_at: new Date().toISOString(),
                    read: false
                  }]).then(({ error }) => {
                    if (error) console.error("Failed to create notification", error);
                  });
                }
              } else {
                // generic failure - log to notification but don't toast
                if (user) {
                  supabase.from('notifications').insert([{
                    user_id: user.id,
                    type: 'alert',
                    title: 'WhatsApp Delivery Failed',
                    message: 'Could not deliver the WhatsApp emergency alert.',
                    created_at: new Date().toISOString(),
                    read: false
                  }]).catch(e => console.error(e));
                }
              }
            }
          } else {
            console.error("WhatsApp Backend Error:", result);
            toast.dismiss('sos-status');
          }
        } catch (waErr) {
          console.error("Failed to call WhatsApp backend", waErr);
          toast.dismiss('sos-status');
        }
      }

      setWhatsappResult(waStatus);
      setIsActive(true);
      
      // Start live location watcher if enabled
      if (shareLocation && "geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCoordinates(newCoords);
            setLocationStr(`${newCoords.lat.toFixed(4)}, ${newCoords.lng.toFixed(4)}`);
            
            // push to backend silently
            await supabase.from('sos_location_updates').insert([{
              sos_id: sosData.id,
              latitude: newCoords.lat,
              longitude: newCoords.lng,
              timestamp: new Date().toISOString()
            }]);
          },
          (err) => console.error("Live location error:", err),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate SOS. Please call emergency services directly.", { id: 'sos-status' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!activeSosId) {
      setIsActive(false);
      navigate('/home');
      return;
    }
    
    setIsProcessing(true);
    toast.loading("Ending SOS...", { id: 'sos-status' });
    
    // Stop the watcher immediately
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      const { error } = await supabase
        .from('sos_sessions')
        .update({
          status: 'Resolved',
          end_time: new Date().toISOString()
        })
        .eq('id', activeSosId);
        
      if (error) throw error;
      
      setIsActive(false);
      setActiveSosId(null);
      toast.success("SOS Deactivated. Emergency event resolved.", { id: 'sos-status' });
      navigate('/emergency-history');
    } catch (err) {
      console.error(err);
      toast.error("Failed to end SOS.", { id: 'sos-status' });
      setIsProcessing(false);
    }
  };

  if (isActive) {
    return (
      <div className="h-[calc(100vh-80px)] bg-red-600 flex flex-col justify-center items-center text-white -m-4 sm:-m-6 lg:-m-8 p-6 text-center">
        <ShieldAlert className="h-24 w-24 mb-6 animate-pulse" />
        <h1 className="text-4xl font-extrabold mb-2">SOS ACTIVE</h1>
        <p className="text-xl text-red-100 mb-8">Emergency protocols initiated.</p>
        
        <div className="bg-red-700/50 rounded-xl p-6 mb-8 w-full max-w-md">
          <div className="flex flex-col items-center justify-center gap-2 mb-4 text-center">
            {whatsappResult && whatsappResult.delivered > 0 ? (
              <p className="font-bold text-green-300">WhatsApp alert submitted for {whatsappResult.delivered} contact(s). (Pending delivery)</p>
            ) : (
              <p className="font-bold text-red-300">{whatsappResult?.errorMessage || "WhatsApp notification failed or not configured."}</p>
            )}
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold">{watchIdRef.current ? "Live Location Sharing Active" : "Current location captured"}</span>
            </div>
          </div>
          <p className="text-sm text-red-200 flex items-center justify-center">
            <MapPin className="h-4 w-4 mr-1 shrink-0" />
            Location: {locationStr} (Last updated: Just now)
          </p>
        </div>

        <Button 
          variant="outline" 
          disabled={isProcessing}
          className="text-slate-900 border-white hover:bg-red-50 bg-white w-full max-w-md text-lg py-6 disabled:opacity-70" 
          onClick={handleDeactivate}
        >
          {isProcessing ? "Stopping..." : "Stop SOS"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-6">
      
      <div className="text-center">
        <div className="bg-red-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Emergency SOS</h1>
        <h2 className="text-xl font-semibold text-red-600">Are you feeling unsafe?</h2>
      </div>

      <Card className="border-red-200 shadow-sm bg-red-50/50">
        <CardContent className="p-6">
          <Button 
            disabled={isProcessing}
            variant="danger" 
            className="w-full text-xl py-8 shadow-lg shadow-red-200 mb-4 bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-70 disabled:animate-none" 
            onClick={handleActivate}
          >
            {isProcessing ? "Requesting Location..." : "Send SOS Now"}
          </Button>
          <div className="text-left text-sm text-red-800 space-y-2">
            <p className="font-bold border-b border-red-200 pb-2">This will immediately:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Share your live location</li>
              <li>Notify your Trusted Contacts</li>
              <li>Record this event in Emergency History</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Call Emergency */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full space-y-4">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full">
              <PhoneCall className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Emergency Services</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Call local authorities instantly</p>
            </div>
            <a href="tel:112" className="w-full">
              <Button variant="outline" className="w-full border-2 border-slate-900 text-slate-900 dark:text-slate-100 font-bold">
                Call 112
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Trusted Contacts */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-5 flex flex-col h-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Trusted Contacts</h3>
            </div>
            <div className="space-y-2 flex-1">
              {['Mom', 'Roommate'].map((contact, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{contact}</span>
                  <a href={`sms:1234567890?body=I feel unsafe. My location is ${locationStr}`} className="text-xs font-bold text-purple-600 hover:text-purple-800">Text</a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Nearest Safe Place */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm md:col-span-2">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full shrink-0">
              <Home className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Nearest Safe Place</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Police Station - 450m away</p>
            </div>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto"
              onClick={() => {
                navigate('/route-planner?dest=Police Station');
              }}
            >
              <MapPin className="h-4 w-4 mr-2" /> Navigate
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4 text-center">
        <Button variant="ghost" className="text-slate-500 dark:text-slate-400 font-bold" onClick={() => navigate(-1)}>
          Cancel & Return
        </Button>
      </div>
    </div>
  );
};
