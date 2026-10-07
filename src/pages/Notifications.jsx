import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Bell, AlertTriangle, Info, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

const DEMO_NOTIFICATIONS = [
  {
    id: 1,
    type: 'alert',
    title: 'Incident reported near your route',
    message: 'A new incident was reported 200m from your saved commute route.',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false,
  },
  {
    id: 2,
    type: 'info',
    title: 'SafeRoute Update',
    message: 'We have added new features to improve your safety tracking.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
  },
  {
    id: 3,
    type: 'alert',
    title: 'Emergency Contact Accepted',
    message: 'Jane Doe has accepted your request to be an emergency contact.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    read: true,
  }
];

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setNotifications(DEMO_NOTIFICATIONS);
          return;
        }

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          setNotifications(DEMO_NOTIFICATIONS);
        } else {
          setNotifications(data);
        }
      } catch (err) {
        setNotifications(DEMO_NOTIFICATIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
      }
    } catch (e) {
      // Ignore in demo
    }
  };

  const markAllAsRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
      }
    } catch (e) {
      // Ignore in demo
    }
  };

  const deleteNotification = async (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast("Notification removed");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').delete().eq('id', id);
      }
    } catch (e) {
      // Ignore in demo
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-slate-500 dark:text-slate-400">
        Loading notifications...
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">You have {unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">All caught up!</h3>
              <p className="text-slate-500 dark:text-slate-400">You have no new notifications.</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map(notification => (
            <Card key={notification.id} className={`transition-colors ${!notification.read ? 'bg-purple-50 dark:bg-purple-900/30/50 border-purple-200' : ''}`}>
              <CardContent className="p-4 sm:p-6 flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  {notification.type === 'alert' ? (
                    <div className="bg-red-100 text-red-600 p-2 rounded-full">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                      <Info className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className={`text-base font-medium truncate ${!notification.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{notification.message}</p>
                  
                  <div className="mt-3 flex gap-2">
                    {!notification.read && (
                      <Button variant="ghost" size="sm" className="text-purple-600 h-8 px-2" onClick={() => markAsRead(notification.id)}>
                        Mark as read
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-red-600 h-8 px-2" onClick={() => deleteNotification(notification.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-purple-600 rounded-full mt-2"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
