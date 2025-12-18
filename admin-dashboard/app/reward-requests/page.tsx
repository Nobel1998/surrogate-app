'use client';

import { useEffect, useState } from 'react';

type RewardRequest = {
  id: string;
  user_id: string;
  user_name: string;
  points_used: number;
  reward_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  request_type: 'full_participation' | 'partial' | 'custom';
  notes?: string | null;
  admin_notes?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export default function RewardRequestsPage() {
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('all');

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

  const updateRequestStatus = async (requestId: string, newStatus: 'approved' | 'rejected' | 'paid', adminNotes?: string) => {
    const statusLabels: Record<string, string> = {
      approved: 'approve',
      rejected: 'reject',
      paid: 'mark as paid',
    };
    
    if (!confirm(`Are you sure you want to ${statusLabels[newStatus]} this reward request?`)) {
      return;
    }

    try {
      const res = await fetch('/api/reward-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: requestId, 
          status: newStatus,
          admin_notes: adminNotes || undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to update: ${res.status} ${errText}`);
      }

      alert(`Reward request ${statusLabels[newStatus]}ed successfully!`);
      await loadRequests();
    } catch (err: any) {
      console.error('Error updating request status:', err);
      alert(err.message || 'Failed to update request status');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
  const paidCount = requests.filter((r) => r.status === 'paid').length;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reward Requests</h1>
            <p className="text-gray-600">Manage reward redemption requests from surrogates</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Total Requests</div>
              <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4">
              <div className="text-sm text-yellow-700">Pending</div>
              <div className="text-2xl font-bold text-yellow-900">{pendingCount}</div>
            </div>
            <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4">
              <div className="text-sm text-blue-700">Approved</div>
              <div className="text-2xl font-bold text-blue-900">{approvedCount}</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
              <div className="text-sm text-red-700">Rejected</div>
              <div className="text-2xl font-bold text-red-900">{rejectedCount}</div>
            </div>
            <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
              <div className="text-sm text-green-700">Paid</div>
              <div className="text-2xl font-bold text-green-900">{paidCount}</div>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected' | 'paid')}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
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
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Used
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reward Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Processed At
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
                          <div className="text-sm text-gray-900">
                            {req.request_type === 'full_participation' ? 'Full Participation ($500)' :
                             req.request_type === 'partial' ? 'Partial' : 'Custom'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-red-600">
                            {req.points_used.toLocaleString()} pts
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            ${req.reward_amount.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              req.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : req.status === 'approved'
                                ? 'bg-blue-100 text-blue-800'
                                : req.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {req.created_at
                            ? new Date(req.created_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {req.processed_at
                            ? new Date(req.processed_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateRequestStatus(req.id, 'approved')}
                                className="text-blue-600 hover:text-blue-900 font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateRequestStatus(req.id, 'rejected')}
                                className="text-red-600 hover:text-red-900 font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <button
                              onClick={() => updateRequestStatus(req.id, 'paid')}
                              className="text-green-600 hover:text-green-900 font-semibold"
                            >
                              Mark as Paid
                            </button>
                          )}
                          {(req.status === 'rejected' || req.status === 'paid') && (
                            <span className="text-gray-400">
                              {req.status === 'paid' ? 'Completed' : 'Rejected'}
                            </span>
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
