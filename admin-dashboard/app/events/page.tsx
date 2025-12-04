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
  status: 'active' | 'cancelled' | 'completed' | 'draft';
  is_featured: boolean;
  max_participants: number;
  current_participants: number;
  created_at: string;
  updated_at: string;
  registration_count?: number;
  likes_count?: number;
}

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 Events Management page loaded - debugging enabled');
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      console.log('Loading events from database...');
      
      // Force fresh data by adding timestamp to avoid caching
      const { data, error } = await supabase
        .from('events_with_stats')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Events loaded:', { data, error });
      if (error) throw error;
      setEvents(data || []);
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
    
    // Add a small delay to ensure database update is complete
    setTimeout(() => {
      loadEvents();
    }, 500);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
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
      alert('Error deleting event: ' + err.message);
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
      alert('Error updating event status: ' + err.message);
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
        <div className="text-xl text-gray-600">Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-500">
        Error loading events: {error}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              🔧 Debug Mode - Last loaded: {new Date().toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create New Event
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
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
                                ⭐ Featured
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
                        <div>👥 {event.registration_count || 0} registered</div>
                        <div>❤️ {event.likes_count || 0} likes</div>
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
                No events found. Create your first event to get started!
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
