import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { ShieldAlert, Search, Filter, AlertTriangle, CheckCircle, XCircle, Clock, MapPin, X, Loader2, Map as MapIcon, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const AdminIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Details
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('incidents')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false });
        
      if (fetchError) throw fetchError;
      setIncidents(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateIncidentStatus = async (id, newStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('incidents')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      toast.success(`Incident ${newStatus} successfully!`);
      
      // Update local state
      setIncidents(incidents.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
      
      // Update modal state if open
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident({ ...selectedIncident, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(`Failed to update status: ${err.message}`);
    }
  };

  // Stats
  const total = incidents.length;
  const pending = incidents.filter(i => i.status === 'Pending').length;
  const approved = incidents.filter(i => i.status === 'Approved').length;
  const flagged = incidents.filter(i => i.status === 'Flagged').length;

  // Filtered List
  const filteredIncidents = incidents.filter(inc => {
    const matchesStatus = statusFilter === 'All' || inc.status === statusFilter;
    const matchesSeverity = severityFilter === 'All' || inc.severity === severityFilter;
    const matchesSearch = !searchQuery || 
      inc.incident_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rejected': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'Flagged': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getSeverityBadge = (severity) => {
    switch(severity) {
      case 'High': return <Badge className="bg-red-50 text-red-700 border-red-200 shadow-none">High Severity</Badge>;
      case 'Medium': return <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-none">Medium Severity</Badge>;
      case 'Low': return <Badge className="bg-green-50 text-green-700 border-green-200 shadow-none">Low Severity</Badge>;
      default: return null;
    }
  };

  if (loading && incidents.length === 0) {
    return <div className="flex h-[calc(100vh-64px)] items-center justify-center text-purple-600"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Failed to load reports</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4">{error}</p>
        <Button onClick={fetchIncidents}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Incident Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Review and manage safety reports submitted by users.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">{total}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Total</span>
          </div>
          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 shadow-sm flex flex-col items-center">
            <span className="text-xl font-black text-amber-600">{pending}</span>
            <span className="text-[10px] uppercase font-bold text-amber-600">Pending</span>
          </div>
          <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 shadow-sm flex flex-col items-center">
            <span className="text-xl font-black text-green-600">{approved}</span>
            <span className="text-[10px] uppercase font-bold text-green-600">Approved</span>
          </div>
          <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm flex flex-col items-center">
            <span className="text-xl font-black text-red-600">{flagged}</span>
            <span className="text-[10px] uppercase font-bold text-red-600">Flagged</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input 
              placeholder="Search reports..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shrink-0">
              {['All', 'Pending', 'Approved', 'Rejected', 'Flagged'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    statusFilter === status 
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shrink-0">
              {['All', 'High', 'Medium', 'Low'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    severityFilter === sev 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {sev === 'All' ? 'All Severities' : sev}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table / List */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold">No incident reports found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Incident</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Location & Time</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50 dark:bg-slate-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{inc.incident_type}</div>
                      <div className="text-xs max-w-[200px] truncate mt-1">
                        {inc.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getSeverityBadge(inc.severity)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="max-w-[200px] truncate">{inc.location_name || `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        {new Date(inc.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusColor(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="font-bold border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:bg-purple-900/30 hover:text-purple-700 hover:border-purple-200"
                        onClick={() => setSelectedIncident(inc)}
                      >
                        View Details <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden border-0">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-purple-600" /> Report Details
              </h2>
              <button 
                onClick={() => setSelectedIncident(null)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-400 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-800 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Info Card */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Incident Type</span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{selectedIncident.incident_type}</h3>
                      </div>
                      {getSeverityBadge(selectedIncident.severity)}
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Description</span>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedIncident.description || 'No detailed description provided.'}
                      </p>
                    </div>
                    
                    {selectedIncident.tags && selectedIncident.tags.length > 0 && (
                      <div className="mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">Tags</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedIncident.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">Submitted By</span>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {selectedIncident.profiles?.full_name || 'Anonymous User'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">Date & Time</span>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {new Date(selectedIncident.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Current Status Card */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Current Status</span>
                      <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full border ${getStatusColor(selectedIncident.status)}`}>
                        {selectedIncident.status}
                      </span>
                    </div>
                    {selectedIncident.status !== 'Approved' && selectedIncident.status !== 'Pending' && (
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Excluded from Safety Score</span>
                    )}
                    {selectedIncident.status === 'Approved' && (
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active in Safety Engine
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-6 flex flex-col h-full">
                  {/* Map Card */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col min-h-[300px]">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3 flex items-center">
                      <MapIcon className="w-4 h-4 mr-1.5" /> Exact Location
                    </span>
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-3 line-clamp-2">
                      {selectedIncident.location_name || `${selectedIncident.latitude}, ${selectedIncident.longitude}`}
                    </div>
                    
                    <div className="rounded-lg overflow-hidden flex-1 border border-slate-200 dark:border-slate-700 relative z-0">
                      <MapContainer 
                        center={[selectedIncident.latitude, selectedIncident.longitude]} 
                        zoom={15} 
                        scrollWheelZoom={true} 
                        className="w-full h-full min-h-[200px]"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
                          url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`}
                        />
                        <Marker position={[selectedIncident.latitude, selectedIncident.longitude]}>
                          <Popup className="font-bold">{selectedIncident.incident_type}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Admin Actions:</span>
              <div className="flex gap-3">
                {selectedIncident.status !== 'Rejected' && (
                  <Button 
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'Rejected')}
                    className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                )}
                
                {selectedIncident.status !== 'Flagged' && (
                  <Button 
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'Flagged')}
                    className="bg-white dark:bg-slate-900 text-red-700 border border-red-200 hover:bg-red-50 font-bold"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1.5" /> Flag
                  </Button>
                )}
                
                {selectedIncident.status !== 'Approved' && (
                  <Button 
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'Approved')}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm shadow-green-200"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
