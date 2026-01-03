'use client';

import { useEffect, useState } from 'react';

type Insurance = {
  id: string;
  user_id: string;
  match_id: string | null;
  insurance_company: string;
  premium: number | null;
  active_date: string;
  agent: string | null;
  purchased_by: 'agency' | 'own' | 'employer';
  policy_number: string | null;
  date_of_birth: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    phone: string;
  };
  match?: {
    id: string;
    surrogate_id: string;
    parent_id: string;
    status: string;
  };
};

type Profile = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

const PURCHASED_BY_OPTIONS: Array<'agency' | 'own' | 'employer'> = ['agency', 'own', 'employer'];

export default function SurrogateInsurancePage() {
  const [insuranceRecords, setInsuranceRecords] = useState<Insurance[]>([]);
  const [surrogates, setSurrogates] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>('all');

  const [formData, setFormData] = useState({
    user_id: '',
    match_id: '',
    insurance_company: '',
    premium: '',
    active_date: '',
    agent: '',
    purchased_by: 'agency' as 'agency' | 'own' | 'employer',
    policy_number: '',
    date_of_birth: '',
    zip_code: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [filterUserId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load surrogates
      const matchesRes = await fetch('/api/matches/options');
      if (!matchesRes.ok) {
        throw new Error(`Failed to load data: ${matchesRes.statusText}`);
      }
      const matchesData = await matchesRes.json();
      
      const surList = (matchesData.profiles || []).filter(
        (p: Profile) => (p.role || '').toLowerCase() === 'surrogate'
      );
      setSurrogates(surList);

      // Load insurance records
      const insuranceRes = await fetch('/api/surrogate-insurance');
      if (!insuranceRes.ok) {
        throw new Error(`Failed to load insurance: ${insuranceRes.statusText}`);
      }
      const insuranceData = await insuranceRes.json();
      
      let records = insuranceData.insurance || [];
      
      // Enrich with user names
      records = records.map((record: Insurance) => {
        const user = surList.find((s: Profile) => s.id === record.user_id);
        return {
          ...record,
          user: user ? { id: user.id, name: user.name, phone: user.phone } : undefined,
        };
      });

      // Apply filter
      if (filterUserId !== 'all') {
        records = records.filter((r: Insurance) => r.user_id === filterUserId);
      }

      setInsuranceRecords(records);
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    // Handle DATE type (YYYY-MM-DD) without timezone conversion
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleAdd = () => {
    setFormData({
      user_id: '',
      match_id: '',
      insurance_company: '',
      premium: '',
      active_date: '',
      agent: '',
      purchased_by: 'agency',
      policy_number: '',
      date_of_birth: '',
      zip_code: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleEdit = (insurance: Insurance) => {
    setSelectedInsurance(insurance);
    setFormData({
      user_id: insurance.user_id,
      match_id: insurance.match_id || '',
      insurance_company: insurance.insurance_company || '',
      premium: insurance.premium?.toString() || '',
      active_date: insurance.active_date ? insurance.active_date.split('T')[0] : '',
      agent: insurance.agent || '',
      purchased_by: insurance.purchased_by,
      policy_number: insurance.policy_number || '',
      date_of_birth: insurance.date_of_birth ? insurance.date_of_birth.split('T')[0] : '',
      zip_code: insurance.zip_code || '',
      notes: insurance.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedInsurance
        ? '/api/surrogate-insurance'
        : '/api/surrogate-insurance';
      const method = selectedInsurance ? 'PUT' : 'POST';

      const payload: any = {
        user_id: formData.user_id,
        insurance_company: formData.insurance_company,
        active_date: formData.active_date,
        purchased_by: formData.purchased_by,
      };

      if (formData.match_id) payload.match_id = formData.match_id;
      if (formData.premium) payload.premium = formData.premium;
      if (formData.agent) payload.agent = formData.agent;
      if (formData.policy_number) payload.policy_number = formData.policy_number;
      if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
      if (formData.zip_code) payload.zip_code = formData.zip_code;
      if (formData.notes) payload.notes = formData.notes;

      if (selectedInsurance) {
        payload.id = selectedInsurance.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save insurance record');
      }

      alert(selectedInsurance ? 'Insurance record updated successfully' : 'Insurance record created successfully');
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedInsurance(null);
      setTimeout(() => {
        loadData();
      }, 100);
    } catch (error: any) {
      console.error('Error saving insurance:', error);
      alert(`Failed to save insurance record: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this insurance record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/surrogate-insurance?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete insurance record');
      }

      alert('Insurance record deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting insurance:', error);
      alert(`Failed to delete insurance record: ${error.message}`);
    }
  };

  const filteredRecords = insuranceRecords;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Surrogate Insurance</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Insurance Record
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Filter by Surrogate</label>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Surrogates</option>
            {surrogates.map((sur) => (
              <option key={sur.id} value={sur.id}>
                {sur.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Total Records</div>
          <div className="text-2xl font-bold">{filteredRecords.length}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Agency Purchased</div>
          <div className="text-2xl font-bold">
            {filteredRecords.filter((r) => r.purchased_by === 'agency').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Total Premium</div>
          <div className="text-2xl font-bold">
            {formatCurrency(
              filteredRecords.reduce((sum, r) => sum + (r.premium || 0), 0)
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No insurance records found</div>
      ) : (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Surrogate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Insurance Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Premium</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchased By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{record.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm">{record.insurance_company}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(record.premium)}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(record.active_date)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      {record.purchased_by}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{record.policy_number || '—'}</td>
                  <td className="px-4 py-3 text-sm">{record.agent || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleEdit(record)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-red-600 hover:text-red-800"
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Insurance Record</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Surrogate *</label>
                  <select
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Surrogate</option>
                    {surrogates.map((sur) => (
                      <option key={sur.id} value={sur.id}>
                        {sur.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Match ID</label>
                  <input
                    type="text"
                    value={formData.match_id}
                    onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Insurance Company & Plan *</label>
                  <input
                    type="text"
                    required
                    value={formData.insurance_company}
                    onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., BLUE CROSS HMO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Premium</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.premium}
                    onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Active Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.active_date}
                    onChange={(e) => setFormData({ ...formData, active_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Agent</label>
                  <input
                    type="text"
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Insurance agent name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Purchased By *</label>
                  <select
                    required
                    value={formData.purchased_by}
                    onChange={(e) => setFormData({ ...formData, purchased_by: e.target.value as 'agency' | 'own' | 'employer' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {PURCHASED_BY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={formData.policy_number}
                    onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Policy number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Zip code"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Insurance Record</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Surrogate *</label>
                  <select
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Surrogate</option>
                    {surrogates.map((sur) => (
                      <option key={sur.id} value={sur.id}>
                        {sur.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Match ID</label>
                  <input
                    type="text"
                    value={formData.match_id}
                    onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Insurance Company & Plan *</label>
                  <input
                    type="text"
                    required
                    value={formData.insurance_company}
                    onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., BLUE CROSS HMO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Premium</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.premium}
                    onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Active Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.active_date}
                    onChange={(e) => setFormData({ ...formData, active_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Agent</label>
                  <input
                    type="text"
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Insurance agent name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Purchased By *</label>
                  <select
                    required
                    value={formData.purchased_by}
                    onChange={(e) => setFormData({ ...formData, purchased_by: e.target.value as 'agency' | 'own' | 'employer' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {PURCHASED_BY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={formData.policy_number}
                    onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Policy number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Zip code"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedInsurance(null);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

