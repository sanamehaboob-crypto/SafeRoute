import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, User, Phone, Mail, Edit2, ShieldAlert, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

export const ProfileTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [userAuth, setUserAuth] = useState(null);
  const [profile, setProfile] = useState({ full_name: '', phone_number: '', created_at: null });
  const [contacts, setContacts] = useState([]);
  
  const [stats, setStats] = useState({ savedTrips: 0, reports: 0 });
  
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({ full_name: '', phone_number: '' });

  // Modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', relationship: '', phone_number: '', is_primary: false });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactDeleting, setContactDeleting] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      
      setUserAuth(session.user);

      // Fetch Profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }
      
      if (!profileData) {
        // Create profile if doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: session.user.id, full_name: '', phone_number: '' }])
          .select()
          .single();
          
        if (createError) throw createError;
        profileData = newProfile;
      }

      setProfile(profileData || { full_name: '', phone_number: '' });
      setPersonalForm({ full_name: profileData?.full_name || '', phone_number: profileData?.phone_number || '' });

      // Fetch Contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      // Fetch Stats
      const [{ count: tripsCount }, { count: incidentsCount }] = await Promise.all([
        supabase.from('saved_trips').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id)
      ]);

      setStats({
        savedTrips: tripsCount || 0,
        reports: incidentsCount || 0
      });

    } catch (err) {
      console.error("Profile Load Error:", err);
      toast.error("Unable to load your profile. Please try again.", { id: 'profile-error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalSave = async () => {
    if (!personalForm.full_name.trim()) {
      toast.error("Full name cannot be empty.", { id: 'personal-val' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: personalForm.full_name.trim(),
          phone_number: personalForm.phone_number.trim()
        })
        .eq('id', userAuth.id);

      if (error) throw error;
      
      setProfile({ ...profile, full_name: personalForm.full_name.trim(), phone_number: personalForm.phone_number.trim() });
      setIsEditingPersonal(false);
      toast.success("Profile updated successfully", { id: 'personal-succ' });
    } catch (err) {
      console.error(err);
      toast.error("Unable to save your changes. Please try again.", { id: 'personal-err' });
    } finally {
      setSaving(false);
    }
  };

  const openAddContact = () => {
    setEditingContact(null);
    setContactForm({ name: '', relationship: '', phone_number: '', is_primary: false });
    setShowContactModal(true);
  };

  const openEditContact = (c) => {
    setEditingContact(c);
    setContactForm({
      name: c.name,
      relationship: c.relationship,
      phone_number: c.phone_number,
      is_primary: c.is_primary || false
    });
    setShowContactModal(true);
  };

  const saveContact = async () => {
    if (!contactForm.name.trim() || !contactForm.relationship.trim() || !contactForm.phone_number.trim()) {
      toast.error("Please fill in all fields.", { id: 'contact-val' });
      return;
    }

    setContactSaving(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || !user.id) {
        throw new Error("Authentication failed. Please log in again.");
      }

      const userId = user.id;

      const payload = {
        user_id: userId,
        name: contactForm.name.trim(),
        relationship: contactForm.relationship.trim(),
        phone_number: contactForm.phone_number.trim(),
        is_primary: contactForm.is_primary
      };

      console.log("--- EMERGENCY CONTACT SAVE OPERATION ---");
      console.log("Auth User ID:", userId);
      console.log("Table:", "emergency_contacts");
      console.log("Payload Keys:", Object.keys(payload));

      if (contactForm.is_primary) {
        const { error: updateError } = await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', userId);
          
        if (updateError) {
          console.error("Emergency Contact Save Error (Primary Reset):", updateError);
          throw updateError;
        }
      }

      let saveError = null;

      if (editingContact) {
        const { error } = await supabase.from('emergency_contacts').update(payload).eq('id', editingContact.id);
        saveError = error;
      } else {
        const { error } = await supabase.from('emergency_contacts').insert([payload]);
        saveError = error;
      }

      if (saveError) {
        console.error("Emergency Contact Save Error:", saveError);
        throw saveError;
      }

      toast.success(editingContact ? "Contact updated" : "Contact added", { id: 'contact-succ' });
      setShowContactModal(false);
      setContactForm({ name: '', relationship: '', phone_number: '', is_primary: false });
      
      const { data } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      setContacts(data || []);

    } catch (err) {
      console.error(err);
      toast.error("Unable to save contact. Please try again.", { id: 'contact-error' });
    } finally {
      setContactSaving(false);
    }
  };

  const deleteContact = async (id) => {
    if (!window.confirm("Delete emergency contact?")) return;
    setContactDeleting(id);
    try {
      const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== id));
      toast.success("Contact removed", { id: 'contact-del-succ' });
    } catch (err) {
      console.error(err);
      toast.error("Unable to delete contact. Please try again.", { id: 'contact-del-err' });
    } finally {
      setContactDeleting(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!userAuth) {
    return (
      <div className="text-center p-12 text-slate-500 dark:text-slate-400">
        <AlertCircle className="h-8 w-8 mx-auto mb-3" />
        <p>Unable to load your profile. Please try logging in again.</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const getInitials = (name, email) => {
    if (name && name.trim()) return name.trim().charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };

  const memberSince = profile.created_at || userAuth.created_at;
  const memberDate = memberSince ? new Date(memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'Recently';
  const displayName = profile.full_name || userAuth.user_metadata?.full_name || userAuth.user_metadata?.name || userAuth.email.split('@')[0];

  return (
    <div className="space-y-5 pb-12 max-w-3xl">
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account information and emergency contacts.</p>
      </div>

      {/* 1. Profile Overview */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xl font-bold text-purple-700 shrink-0">
                {getInitials(displayName, userAuth.email)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{displayName}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{userAuth.email}</p>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 block">SafeRoute member</span>
              </div>
            </div>
            <Button variant="outline" className="shrink-0 w-full sm:w-auto" onClick={() => setIsEditingPersonal(true)}>
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Personal Information */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-row justify-between items-center px-6 pt-6">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Personal Information</CardTitle>
          {!isEditingPersonal && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditingPersonal(true)} className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:bg-purple-900/30 -mr-2">
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {isEditingPersonal ? (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <Input 
                  value={personalForm.full_name} 
                  onChange={e => setPersonalForm({...personalForm, full_name: e.target.value})}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <Input 
                  value={userAuth.email} 
                  disabled
                  className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <Input 
                  value={personalForm.phone_number} 
                  onChange={e => setPersonalForm({...personalForm, phone_number: e.target.value})}
                  placeholder="e.g. +1 234 567 890"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handlePersonalSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditingPersonal(false)} disabled={saving}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Full Name</p>
                <p className="text-base text-slate-900 dark:text-slate-100">
                  {displayName}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Email Address</p>
                <p className="text-base text-slate-900 dark:text-slate-100">{userAuth.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Phone Number</p>
                <p className={`text-base ${profile.phone_number ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                  {profile.phone_number || 'Not provided'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Emergency Contacts */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center px-6 pt-6 gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Emergency Contacts</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">People you can contact quickly during an emergency.</p>
          </div>
          <Button onClick={openAddContact} className="shrink-0 w-full sm:w-auto" variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Add Contact
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {contacts.length === 0 ? (
            <div className="text-center py-6">
              <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">No emergency contacts yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">Add someone you trust so they can be reached quickly during an emergency.</p>
              <Button onClick={openAddContact} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Emergency Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map(contact => (
                <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{contact.name}</h4>
                        {contact.is_primary && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 uppercase tracking-wide">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{contact.relationship}</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100 mt-0.5">{contact.phone_number}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditContact(contact)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteContact(contact.id)} disabled={contactDeleting === contact.id}>
                      {contactDeleting === contact.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Account Summary */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 px-6 pt-6">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center sm:text-left">
            <div className="px-2 sm:px-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Member Since</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{memberDate}</p>
            </div>
            <div className="px-2 sm:px-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Saved Trips</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{stats.savedTrips}</p>
            </div>
            <div className="px-2 sm:px-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Reports</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{stats.reports}</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center sm:justify-start">
            <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">{editingContact ? 'Edit Contact' : 'Add Emergency Contact'}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Name</label>
                  <Input 
                    value={contactForm.name} 
                    onChange={e => setContactForm({...contactForm, name: e.target.value})}
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                  <Input 
                    value={contactForm.relationship} 
                    onChange={e => setContactForm({...contactForm, relationship: e.target.value})}
                    placeholder="e.g. Mother, Friend, Partner"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <Input 
                    value={contactForm.phone_number} 
                    onChange={e => setContactForm({...contactForm, phone_number: e.target.value})}
                    placeholder="e.g. +1 234 567 890"
                  />
                </div>
                
                <div className="flex items-center gap-3 py-3 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    className={`${
                      contactForm.is_primary ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                    onClick={() => setContactForm({...contactForm, is_primary: !contactForm.is_primary})}
                  >
                    <span
                      className={`${
                        contactForm.is_primary ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Set as Primary Contact</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">This contact will be prioritized in emergencies.</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1" onClick={saveContact} disabled={contactSaving}>
                    {contactSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save Contact'}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowContactModal(false)} disabled={contactSaving}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
