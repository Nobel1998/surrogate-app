'use client';

import { useEffect, useState } from 'react';

type ClientPayment = {
  id: string;
  match_id: string;
  payment_installment: '一期款' | '二期款' | '三期款' | '四期款';
  amount: number;
  payment_date: string;
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

const INSTALLMENT_OPTIONS: Array<'一期款' | '二期款' | '三期款' | '四期款'> = ['一期款', '二期款', '三期款', '四期款'];

export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ClientPayment | null>(null);
  const [filterMatchId, setFilterMatchId] = useState<string>('all');
  const [filterInstallment, setFilterInstallment] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    match_id: '',
    payment_installment: '一期款' as '一期款' | '二期款' | '三期款' | '四期款',
    amount: '',
    payment_date: '',
    payment_method: '',
    payment_reference: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [filterMatchId, filterInstallment]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load matches
      const matchesRes = await fetch('/api/matches/options');
      if (!matchesRes.ok) {
        throw new Error(`Failed to load matches: ${matchesRes.statusText}`);
      }
      const matchesData = await matchesRes.json();
      
      const enrichedMatches = (matchesData.matches || []).map((m: any) => {
        const surrogate = matchesData.profiles?.find((p: any) => p.id === m.surrogate_id);
        const parent = matchesData.profiles?.find((p: any) => p.id === m.parent_id);
        return {
          ...m,
          surrogate,
          parent,
        };
      });
      
      setMatches(enrichedMatches);

      // Load payments
      let url = '/api/client-payments';
      const params = new URLSearchParams();
      if (filterMatchId !== 'all') {
        params.append('match_id', filterMatchId);
      }
      if (filterInstallment !== 'all') {
        params.append('installment', filterInstallment);
      }
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load payments: ${res.statusText}`);
      }
      const data = await res.json();
      setPayments(data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load client payments');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      match_id: '',
      payment_installment: '一期款',
      amount: '',
      payment_date: '',
      payment_method: '',
      payment_reference: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleEdit = (payment: ClientPayment) => {
    setSelectedPayment(payment);
    setFormData({
      match_id: payment.match_id,
      payment_installment: payment.payment_installment,
      amount: payment.amount.toString(),
      payment_date: payment.payment_date.split('T')[0],
      payment_method: payment.payment_method || '',
      payment_reference: payment.payment_reference || '',
      notes: payment.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/client-payments';
      const method = showEditModal ? 'PATCH' : 'POST';
      const body = showEditModal
        ? { id: selectedPayment?.id, ...formData }
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
      console.log('[client-payments] Save result:', {
        method,
        result,
        success: result.success,
        data: result.data,
      });

      if (!result.success && result.error) {
        throw new Error(result.error);
      }

      alert(showEditModal ? 'Payment updated successfully' : 'Payment created successfully');
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedPayment(null);
      
      setTimeout(async () => {
        try {
          await loadData();
          console.log('[client-payments] Data reloaded after save');
        } catch (err) {
          console.error('[client-payments] Error reloading data after save:', err);
        }
      }, 200);
    } catch (error: any) {
      console.error('Error saving payment:', error);
      alert(error.message || 'Failed to save payment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/client-payments?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      alert('Payment deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      alert(error.message || 'Failed to delete payment');
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
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredPayments = payments.filter((payment) => {
    if (filterMatchId !== 'all' && payment.match_id !== filterMatchId) return false;
    if (filterInstallment !== 'all' && payment.payment_installment !== filterInstallment) return false;
    return true;
  });

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const getInstallmentColor = (installment: string) => {
    switch (installment) {
      case '一期款':
        return 'bg-blue-100 text-blue-800';
      case '二期款':
        return 'bg-green-100 text-green-800';
      case '三期款':
        return 'bg-yellow-100 text-yellow-800';
      case '四期款':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Client Payment Records</h1>
          <p className="text-gray-600 mt-2">Manage client payment records (一期款, 二期款, 三期款, 四期款)</p>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Match</label>
              <select
                value={filterMatchId}
                onChange={(e) => setFilterMatchId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Matches</option>
                {matches.map((match) => {
                  const surrogateName = match.surrogate?.name || match.surrogate_id?.substring(0, 8) || 'Surrogate';
                  const parentName = match.parent?.name || match.parent_id?.substring(0, 8) || 'Parent';
                  return (
                    <option key={match.id} value={match.id}>
                      {surrogateName} - {parentName} {match.status ? `(${match.status})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Installment</label>
              <select
                value={filterInstallment}
                onChange={(e) => setFilterInstallment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Installments</option>
                {INSTALLMENT_OPTIONS.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                + Add Payment Record
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Records</div>
              <div className="text-2xl font-bold text-gray-900">{filteredPayments.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-600">Loading payment records...</div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-600">No payment records found</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Match
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Installment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {payment.match?.surrogate?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.match?.parent?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getInstallmentColor(payment.payment_installment)}`}>
                          {payment.payment_installment}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(payment.payment_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.payment_method || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.payment_reference || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(payment)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
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
          </div>
        )}

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {showEditModal ? 'Edit Payment Record' : 'Add Payment Record'}
                </h2>
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
                        matches.map((match) => {
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
                      Installment *
                    </label>
                    <select
                      required
                      value={formData.payment_installment}
                      onChange={(e) => setFormData({ ...formData, payment_installment: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {INSTALLMENT_OPTIONS.map((inst) => (
                        <option key={inst} value={inst}>
                          {inst}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
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
                      placeholder="e.g., Bank Transfer, Credit Card, Check"
                    />
                  </div>

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows={3}
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setSelectedPayment(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      {showEditModal ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

