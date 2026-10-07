import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Navigation, Home, Briefcase, Dumbbell, MapPin, Edit, Trash2, Plus, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabase';
import { geocode } from '../services/mapService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PLACE_TYPES = [
  { id: 'Home', icon: Home },
  { id: 'Work', icon: Briefcase },
  { id: 'Gym', icon: Dumbbell },
  { id: 'Custom', icon: MapPin },
];

export const SavedPlaces = () => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: 'Home', customName: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('saved_places').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.warn("Supabase fetch failed, falling back to localStorage", error);
      const localPlaces = JSON.parse(localStorage.getItem('saved_places') || '[]');
      setPlaces(localPlaces);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.address) return toast.error("Address is required");
    
    const finalName = formData.name === 'Custom' ? formData.customName : formData.name;
    if (!finalName) return toast.error("Place name is required");

    setIsSubmitting(true);
    let coords = { lat: 0, lng: 0 };
    
    try {
      const res = await geocode(formData.address);
      if (res && res.length > 0) {
        coords = { lng: res[0].center[0], lat: res[0].center[1] };
      }
    } catch (err) {
      console.warn("Geocoding failed, using dummy coordinates");
      // Dummy coords
      coords = { lng: -0.1276, lat: 51.5072 }; // London
    }

    const placeData = {
      name: finalName,
      type: formData.name, // Home, Work, Gym, Custom
      address: formData.address,
      lat: coords.lat,
      lng: coords.lng,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('saved_places').update(placeData).eq('id', editingId);
        if (error) throw error;
        toast.success("Place updated");
      } else {
        placeData.created_at = new Date().toISOString();
        const { error } = await supabase.from('saved_places').insert([placeData]);
        if (error) throw error;
        toast.success("Place saved");
      }
    } catch (error) {
      console.warn("Supabase save failed, using localStorage", error);
      let localPlaces = JSON.parse(localStorage.getItem('saved_places') || '[]');
      if (editingId) {
        localPlaces = localPlaces.map(p => p.id === editingId ? { ...p, ...placeData } : p);
      } else {
        localPlaces.push({ ...placeData, id: Date.now().toString() });
      }
      localStorage.setItem('saved_places', JSON.stringify(localPlaces));
      toast.success(editingId ? "Place updated locally" : "Place saved locally");
    }

    setIsSubmitting(false);
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ name: 'Home', customName: '', address: '' });
    fetchPlaces();
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('saved_places').delete().eq('id', id);
      if (error) throw error;
      toast.success("Place deleted");
    } catch (error) {
      console.warn("Supabase delete failed, using localStorage", error);
      let localPlaces = JSON.parse(localStorage.getItem('saved_places') || '[]');
      localPlaces = localPlaces.filter(p => p.id !== id);
      localStorage.setItem('saved_places', JSON.stringify(localPlaces));
      toast.success("Place deleted locally");
    }
    fetchPlaces();
  };

  const handleEdit = (place) => {
    setEditingId(place.id);
    setFormData({
      name: place.type || 'Custom',
      customName: place.type === 'Custom' ? place.name : '',
      address: place.address
    });
    setShowAddForm(true);
  };

  const handleUseAsOrigin = (place) => {
    // Navigate to RoutePlanner and tell it to use this as origin.
    // The current RoutePlanner doesn't natively accept 'origin' in searchParams, but we can pass it via state.
    navigate('/route-planner', { state: { originName: place.name, originCoords: [place.lng, place.lat], originAddress: place.address } });
  };

  const handleUseAsDest = (place) => {
    // Navigate using the existing dest query param
    navigate(`/route-planner?dest=${encodeURIComponent(place.address)}`, { state: { destCoords: [place.lng, place.lat] } });
  };

  const getIcon = (type) => {
    const pt = PLACE_TYPES.find(p => p.id === type);
    const Icon = pt ? pt.icon : MapPin;
    return <Icon className="h-5 w-5 text-purple-600" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Saved Places</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your frequently visited locations.</p>
        </div>
        {!showAddForm && (
          <Button onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ name: 'Home', customName: '', address: '' }); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Place
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="border-purple-200 shadow-md">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Place' : 'Add New Place'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {PLACE_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, name: type.id })}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      formData.name === type.id ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30' : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <type.icon className={`h-6 w-6 mb-2 ${formData.name === type.id ? 'text-purple-600' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className={`text-xs font-bold ${formData.name === type.id ? 'text-purple-700' : 'text-slate-500 dark:text-slate-400'}`}>{type.id}</span>
                  </button>
                ))}
              </div>

              {formData.name === 'Custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custom Name</label>
                  <Input 
                    placeholder="e.g. Grandma's House" 
                    value={formData.customName} 
                    onChange={e => setFormData({ ...formData, customName: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <Input 
                  placeholder="Enter full address" 
                  value={formData.address} 
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? 'Update Place' : 'Save Place'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
        </div>
      ) : places.length === 0 ? (
        <Card className="text-center p-12 bg-slate-50 dark:bg-slate-800 border-dashed">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No places saved yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">Add your home, workplace, or other frequent destinations to plan safer routes more quickly.</p>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Your First Place
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {places.map(place => (
            <Card key={place.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-full shrink-0">
                    {getIcon(place.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{place.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{place.address}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={() => handleUseAsOrigin(place)} className="flex-1 sm:flex-none">
                    <Navigation className="h-4 w-4 mr-1.5" /> Start here
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleUseAsDest(place)} className="flex-1 sm:flex-none">
                    Go here <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                  
                  <div className="flex items-center gap-1 ml-auto sm:ml-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(place)} title="Edit">
                      <Edit className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(place.id)} title="Delete" className="hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
