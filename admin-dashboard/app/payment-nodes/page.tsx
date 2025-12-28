'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type PaymentNode = {
  id: string;
  match_id: string;
  node_name: string;
  node_type: 'milestone' | 'monthly' | 'one-time';
  amount: number;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  match?: {
    id: string;
    surrogate_id: string;
    parent_id: string;
    status: string;
    surrogate?: {
      id: string;
      name: string;
      phone: string;
    };
    parent?: {
      id: string;
      name: string;
      phone: string;
    };
  };
};

type Match = {
  id: string;
  surrogate_id: string;
  parent_id: string;
  status: string;
  surrogate?: {
    id: string;
    name: string;
    phone: string;
  };
  parent?: {
    id: string;
    name: string;
    phone: string;
  };
};

export default function PaymentNodesPage() {
  const [paymentNodes, setPaymentNodes] = useState<PaymentNode[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<PaymentNode | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMatchId, setFilterMatchId] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    match_id: '',
    node_name: '',
    node_type: 'milestone' as 'milestone' | 'monthly' | 'one-time',
    amount: '',
    due_date: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue' | 'cancelled',
    payment_date: '',
    payment_method: '',
    payment_reference: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [filterStatus, filterMatchId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load matches
      const matchesRes = await fetch('/api/matches/options');
      if (!matchesRes.ok) {
        throw new Error(`Failed to load matches: ${matchesRes.statusText}`);
      }
      const matchesData = await matchesRes.json();
      
      console.log('[payment-nodes] API response:', {
        hasMatches: !!matchesData.matches,
        matchesCount: matchesData.matches?.length || 0,
        hasProfiles: !!matchesData.profiles,
        profilesCount: matchesData.profiles?.length || 0,
        keys: Object.keys(matchesData),
      });
      
      // The API returns { matches: [...], profiles: [...] }
      // We need to enrich matches with surrogate and parent info from profiles
      const matches = matchesData.matches || [];
      const profiles = matchesData.profiles || [];
      
      // Create a map of profiles by id for quick lookup
      const profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
      
      // Enrich matches with surrogate and parent information
      const enrichedMatches = matches.map((match: any) => {
        const surrogate = profilesMap.get(match.surrogate_id) || null;
        const parent = profilesMap.get(match.parent_id) || null;
        
        return {
          ...match,
          surrogate,
          parent,
        };
      });
      
      console.log('[payment-nodes] Loaded matches:', {
        total: enrichedMatches.length,
        sample: enrichedMatches.slice(0, 3).map((m: any) => ({
          id: m.id,
          surrogate_id: m.surrogate_id,
          parent_id: m.parent_id,
          surrogate: m.surrogate?.name || 'N/A',
          parent: m.parent?.name || 'N/A',
          status: m.status,
        })),
      });
      
      if (enrichedMatches.length === 0) {
        console.warn('[payment-nodes] No matches found!');
      }
      
      setMatches(enrichedMatches);

      // Load payment nodes
      let url = '/api/payment-nodes';
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterMatchId !== 'all') {
        params.append('match_id', filterMatchId);
      }
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load payment nodes: ${res.statusText}`);
      }
      const data = await res.json();
      
      console.log('[payment-nodes] Loaded payment nodes:', {
        response: data,
        nodesCount: data.data?.length || 0,
        nodes: data.data?.slice(0, 3) || [],
      });
      
      setPaymentNodes(data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load payment nodes');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      match_id: '',
      node_name: '',
      node_type: 'milestone',
      amount: '',
      due_date: '',
      status: 'pending',
      payment_date: '',
      payment_method: '',
      payment_reference: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleEdit = (node: PaymentNode) => {
    setSelectedNode(node);
    
    // Extract date part (YYYY-MM-DD) for date inputs
    // This ensures the date input shows the correct date without timezone issues
    const formatDateForInput = (dateStr: string | null) => {
      if (!dateStr) return '';
      // Extract date part if it's a full ISO string, otherwise use as-is
      return dateStr.split('T')[0];
    };
    
    setFormData({
      match_id: node.match_id,
      node_name: node.node_name,
      node_type: node.node_type,
      amount: node.amount.toString(),
      due_date: formatDateForInput(node.due_date),
      status: node.status,
      payment_date: formatDateForInput(node.payment_date),
      payment_method: node.payment_method || '',
      payment_reference: node.payment_reference || '',
      notes: node.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = showEditModal ? '/api/payment-nodes' : '/api/payment-nodes';
      const method = showEditModal ? 'PATCH' : 'POST';
      const body = showEditModal
        ? { id: selectedNode?.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const result = await res.json();
      console.log('[payment-nodes] Save result:', {
        method,
        result,
        success: result.success,
        data: result.data,
      });

      if (!result.success && result.error) {
        throw new Error(result.error);
      }

      alert(showEditModal ? 'Payment node updated successfully' : 'Payment node created successfully');
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedNode(null);
      
      // Reload data to get the latest payment nodes with match information
      // Use setTimeout to ensure modal is fully closed before reloading
      setTimeout(async () => {
        try {
          await loadData();
          console.log('[payment-nodes] Data reloaded after save');
        } catch (err) {
          console.error('[payment-nodes] Error reloading data after save:', err);
          // Don't show error to user, just log it - the data will refresh on next page load
        }
      }, 200);
    } catch (error: any) {
      console.error('Error saving payment node:', error);
      alert(error.message || 'Failed to save payment node');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment node?')) {
      return;
    }

    try {
      const res = await fetch(`/api/payment-nodes?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete payment node');
      }

      alert('Payment node deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting payment node:', error);
      alert(error.message || 'Failed to delete payment node');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'bg-blue-100 text-blue-800';
      case 'monthly':
        return 'bg-purple-100 text-purple-800';
      case 'one-time':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
    // For DATE type (YYYY-MM-DD), parse directly without timezone conversion
    // Extract date part if it's a full ISO string
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    // Create date in local timezone to avoid UTC conversion issues
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredNodes = paymentNodes.filter((node) => {
    if (filterStatus !== 'all' && node.status !== filterStatus) return false;
    if (filterMatchId !== 'all' && node.match_id !== filterMatchId) return false;
    return true;
  });

  const totalAmount = filteredNodes.reduce((sum, node) => sum + node.amount, 0);
  const paidAmount = filteredNodes
    .filter((node) => node.status === 'paid')
    .reduce((sum, node) => sum + node.amount, 0);
  const pendingAmount = filteredNodes
    .filter((node) => node.status === 'pending')
    .reduce((sum, node) => sum + node.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Nodes</h1>
            <p className="text-gray-600 mt-1">Manage payment milestones and scheduled payments</p>
          </div>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Payment Node</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Nodes</div>
            <div className="text-2xl font-bold text-gray-900">{filteredNodes.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Paid Amount</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Pending Amount</div>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Match
              </label>
              <select
                value={filterMatchId}
                onChange={(e) => setFilterMatchId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Matches</option>
                {matches.length === 0 ? (
                  <option value="all" disabled>No matches available</option>
                ) : (
                  matches.map((match: any) => {
                    const surrogateName = match.surrogate?.name || match.surrogate_id?.substring(0, 8) || 'Surrogate';
                    const parentName = match.parent?.name || match.parent_id?.substring(0, 8) || 'Parent';
                    return (
                      <option key={match.id} value={match.id}>
                        {surrogateName} - {parentName} {match.status ? `(${match.status})` : ''}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Payment Nodes Table */}
        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-600">Loading payment nodes...</div>
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-600">No payment nodes found</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Node Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNodes.map((node) => (
                  <tr key={node.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {node.match?.surrogate?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {node.match?.parent?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{node.node_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getNodeTypeColor(node.node_type)}`}>
                        {node.node_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(node.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(node.due_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(node.status)}`}>
                        {node.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(node.payment_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(node)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(node.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {showEditModal ? 'Edit Payment Node' : 'Add Payment Node'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedNode(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match *
                  </label>
                  <select
                    required
                    value={formData.match_id}
                    onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    disabled={showEditModal}
                  >
                    <option value="">Select a match</option>
                    {matches.length === 0 ? (
                      <option value="" disabled>No matches available</option>
                    ) : (
                      matches.map((match: any) => {
                        const surrogateName = match.surrogate?.name || match.surrogate_id?.substring(0, 8) || 'Surrogate';
                        const parentName = match.parent?.name || match.parent_id?.substring(0, 8) || 'Parent';
                        return (
                          <option key={match.id} value={match.id}>
                            {surrogateName} - {parentName} {match.status ? `(${match.status})` : ''}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Node Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.node_name}
                    onChange={(e) => setFormData({ ...formData, node_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Contract Signing, Transfer Success, Monthly Allowance"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Node Type *
                    </label>
                    <select
                      required
                      value={formData.node_type}
                      onChange={(e) => setFormData({ ...formData, node_type: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="milestone">Milestone</option>
                      <option value="monthly">Monthly</option>
                      <option value="one-time">One-time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount ($) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {formData.status === 'paid' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method
                      </label>
                      <input
                        type="text"
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="e.g., Bank Transfer, Check, Wire"
                      />
                    </div>
                  </div>
                )}

                {formData.status === 'paid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Reference
                    </label>
                    <input
                      type="text"
                      value={formData.payment_reference}
                      onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Transaction ID, Check Number, etc."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="Additional notes about this payment node..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedNode(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {showEditModal ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

