'use client';

import { useEffect, useState } from 'react';
import Navigation from '../../components/Navigation';

type RewardRequest = {
  id: string;
  user_id: string;
  user_name: string;
  reward_item: string;
  points_cost: number;
  status: 'pending' | 'sent';
  created_at: string;
  updated_at: string;
  sent_at?: string | null;
  notes?: string | null;
};

export default function RewardRequestsPage() {
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'sent'>('all');

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reward-requests');
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load requests: ${res.status} ${errText}`);
      }
      const { requests: requestsData } = await res.json();
      setRequests(requestsData || []);
    } catch (err: any) {
      console.error('Error loading reward requests:', err);
      setError(err.message || 'Failed to load reward requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const markAsSent = async (requestId: string) => {
    if (!confirm('Mark this reward request as sent? This will update the status to "Sent".')) {
      return;
    }

    try {
      const res = await fetch('/api/reward-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status: 'sent' }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to update: ${res.status} ${errText}`);
      }

      alert('Reward request marked as sent successfully!');
      await loadRequests();
    } catch (err: any) {
      console.error('Error marking as sent:', err);
      alert(err.message || 'Failed to mark as sent');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const sentCount = requests.filter((r) => r.status === 'sent').length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reward Requests</h1>
            <p className="text-gray-600">Manage reward redemption requests from surrogates</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Total Requests</div>
              <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4">
              <div className="text-sm text-yellow-700">Pending</div>
              <div className="text-2xl font-bold text-yellow-900">{pendingCount}</div>
            </div>
            <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
              <div className="text-sm text-green-700">Sent</div>
              <div className="text-2xl font-bold text-green-900">{sentCount}</div>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'sent')}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
              </select>
              <button
                onClick={loadRequests}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {/* Requests Table */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-gray-600">Loading reward requests...</div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-gray-600">No reward requests found.</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Surrogate Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reward Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{req.user_name}</div>
                          <div className="text-xs text-gray-500">{req.user_id.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{req.reward_item}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-red-600">
                            -{req.points_cost} pts
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              req.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {req.status === 'pending' ? 'Pending' : 'Sent'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {req.created_at
                            ? new Date(req.created_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {req.sent_at
                            ? new Date(req.sent_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {req.status === 'pending' && (
                            <button
                              onClick={() => markAsSent(req.id)}
                              className="text-blue-600 hover:text-blue-900 font-semibold"
                            >
                              Mark as Sent
                            </button>
                          )}
                          {req.status === 'sent' && (
                            <span className="text-gray-400">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
