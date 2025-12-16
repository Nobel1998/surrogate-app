'use client';

import { useEffect, useState } from 'react';

type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  admin_response?: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    role?: string;
  } | null;
};

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/support-tickets');
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load tickets: ${res.status} ${errText}`);
      }
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminResponse(ticket.admin_response || '');
    setShowDetailModal(true);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTicket.id,
          admin_response: adminResponse.trim() || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Update failed: ${res.status} ${errText}`);
      }

      await loadTickets();
      setShowDetailModal(false);
      setSelectedTicket(null);
      setAdminResponse('');
      alert('Ticket updated successfully!');
    } catch (err: any) {
      console.error('Error updating ticket:', err);
      alert(err.message || 'Failed to update ticket');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ticketId,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Update failed: ${res.status} ${errText}`);
      }

      await loadTickets();
      alert('Status updated successfully!');
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTickets = filterStatus === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading support tickets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Support Tickets</h1>
          <p className="text-gray-600">View and manage customer support tickets.</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            <button
              onClick={loadTickets}
              className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      No tickets found.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {ticket.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{ticket.user?.name || 'Unknown User'}</div>
                          <div className="text-xs text-gray-500">
                            {ticket.user?.email || ticket.user?.phone || ticket.user_id.substring(0, 8)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={ticket.subject}>
                          {ticket.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(ticket.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        <button
                          onClick={() => handleViewTicket(ticket)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          View
                        </button>
                        <select
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                          value={ticket.status}
                          onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Ticket Details</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTicket(null);
                  setAdminResponse('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {selectedTicket.user?.name || 'Unknown User'}
                  {selectedTicket.user?.email && ` (${selectedTicket.user.email})`}
                  {selectedTicket.user?.phone && ` • ${selectedTicket.user.phone}`}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {selectedTicket.subject}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedTicket.status)}`}>
                  {selectedTicket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Created</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {formatDate(selectedTicket.created_at)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User Message</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Response</label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Enter your response to the user..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTicket(null);
                  setAdminResponse('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTicket}
                disabled={updatingStatus}
                className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                  updatingStatus
                    ? 'bg-gray-400'
                    : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                {updatingStatus ? 'Updating...' : 'Save Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
