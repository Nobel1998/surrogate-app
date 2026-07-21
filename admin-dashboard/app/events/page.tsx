'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import EventForm from './EventForm';

interface Event {
  id: string;
  title: string;
  description: string;
  content: string;
  event_date: string;
  location: string;
  category: string;
  image_url: string;
  video_url?: string;
  status: 'active' | 'cancelled' | 'completed' | 'draft';
  is_featured: boolean;
  max_participants: number;
  current_participants: number;
  created_at: string;
  updated_at: string;
  registration_count?: number;
  likes_count?: number;
  views_count?: number;
  visitors_count?: number;
}

function visitorIdentity(row: { user_id?: string | null; visitor_key?: string | null }) {
  if (row.user_id) return `u:${row.user_id}`;
  if (row.visitor_key) return `v:${row.visitor_key}`;
  return null;
}

export default function BlogManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewsUnavailable, setViewsUnavailable] = useState(false);
  const [globalUniqueVisitors, setGlobalUniqueVisitors] = useState(0);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setViewsUnavailable(false);
      
      // Use a filter that always returns true to bypass cache
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .not('id', 'is', null)  // This filter always returns all records but bypasses cache
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;
      

      // Get registration counts
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('status', 'registered');

      // Get likes counts  
      const { data: likes } = await supabase
        .from('event_likes')
        .select('event_id');

      // Get blog article views
      let views: { event_id: string; user_id?: string | null; visitor_key?: string | null }[] = [];
      const { data: viewsData, error: viewsError } = await supabase
        .from('event_views')
        .select('event_id, user_id, visitor_key');

      if (viewsError) {
        console.warn('event_views not available:', viewsError.message);
        setViewsUnavailable(true);
      } else {
        views = viewsData || [];
      }

      const viewsByEvent = new Map<string, { views: number; visitors: Set<string> }>();
      const globalVisitors = new Set<string>();

      views.forEach((row) => {
        const identity = visitorIdentity(row);
        if (identity) globalVisitors.add(identity);
        if (!row.event_id) return;
        if (!viewsByEvent.has(row.event_id)) {
          viewsByEvent.set(row.event_id, { views: 0, visitors: new Set() });
        }
        const bucket = viewsByEvent.get(row.event_id)!;
        bucket.views += 1;
        if (identity) bucket.visitors.add(identity);
      });

      setGlobalUniqueVisitors(globalVisitors.size);

      // Combine data
      const eventsWithStats = (eventsData || []).map(event => {
        const registrationCount = registrations?.filter(r => r.event_id === event.id).length || 0;
        const likesCount = likes?.filter(l => l.event_id === event.id).length || 0;
        const viewStats = viewsByEvent.get(event.id);
        
        return {
          ...event,
          registration_count: registrationCount,
          likes_count: likesCount,
          views_count: viewStats?.views || 0,
          visitors_count: viewStats?.visitors.size || 0,
          current_participants: registrationCount
        };
      });

      setEvents(eventsWithStats);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingEvent(null);
    
    // Small delay to ensure database transaction is committed
    setTimeout(() => {
      loadEvents();
    }, 500);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this blog article?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      loadEvents();
    } catch (err: any) {
      alert('Error deleting blog article: ' + err.message);
    }
  };

  const toggleEventStatus = async (eventId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId);

      if (error) throw error;
      loadEvents();
    } catch (err: any) {
      alert('Error updating article status: ' + err.message);
    }
  };

  const toggleFeatured = async (eventId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_featured: !currentFeatured })
        .eq('id', eventId);

      if (error) throw error;
      loadEvents();
    } catch (err: any) {
      alert('Error updating featured status: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Loading blog articles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-500">
        Error loading blog articles: {error}
      </div>
    );
  }

  const totalViews = events.reduce((sum, e) => sum + (e.views_count || 0), 0);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              App article opens are counted when a user opens the blog detail screen.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadEvents}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create New Blog
            </button>
          </div>
        </div>

        {viewsUnavailable && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            View tracking table is not available yet. Run{' '}
            <code className="font-mono text-xs">migrations/create_event_views_table.sql</code> in
            Supabase to enable Visitors / Views.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="text-sm font-medium text-gray-500">Total article opens (Views)</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{totalViews}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="text-sm font-medium text-gray-500">Unique visitors (all articles)</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{globalUniqueVisitors}</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        {event.image_url && (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                            {event.is_featured && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Featured
                              </span>
                            )}
                            {event.video_url && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Video
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {event.description?.substring(0, 100)}...
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            {event.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{new Date(event.event_date).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(event.event_date).toLocaleTimeString()}</div>
                        <div className="mt-1 text-xs text-gray-400">{event.location}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full ${
                        event.status === 'active' ? 'bg-green-100 text-green-800' :
                        event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {event.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div className="font-medium text-gray-800">
                          Visitors: {event.visitors_count || 0}
                        </div>
                        <div>Views: {event.views_count || 0}</div>
                        <div className="mt-1">{event.registration_count || 0} registered</div>
                        <div>{event.likes_count || 0} likes</div>
                        {event.max_participants && (
                          <div className="text-xs">Max: {event.max_participants}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(event)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleEventStatus(event.id, event.status)}
                          className="text-green-600 hover:text-green-900"
                        >
                          {event.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => toggleFeatured(event.id, event.is_featured)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          {event.is_featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {events.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                No blog articles found. Create your first article to get started!
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <EventForm
          event={editingEvent}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
