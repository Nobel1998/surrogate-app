'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Case = {
  id: string;
  claim_id: string;
  surrogate_id?: string | null;
  first_parent_id?: string | null;
  second_parent_id?: string | null;
  case_type: string;
  manager_id?: string | null;
  branch_id?: string | null;
  current_step?: string | null;
  weeks_pregnant: number;
  estimated_due_date?: string | null;
  number_of_fetuses: number;
  fetal_beat_confirm: string;
  sign_date?: string | null;
  transfer_date?: string | null;
  beta_confirm_date?: string | null;
  due_date?: string | null;
  clinic?: string | null;
  embryos?: string | null;
  lawyer?: string | null;
  company?: string | null;
  files?: any;
  status: string;
  created_at: string;
  updated_at: string;
  surrogate_name?: string | null;
  first_parent_name?: string | null;
  second_parent_name?: string | null;
  manager_name?: string | null;
};

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/cases?${params.toString()}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load cases: ${res.status} ${errText}`);
      }
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err: any) {
      console.error('Error loading cases:', err);
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadCases();
  };

  const handleDelete = async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this case?')) {
      return;
    }

    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete case');
      }

      await loadCases();
    } catch (err: any) {
      alert(err.message || 'Failed to delete case');
    }
  };

  const toggleSelectCase = (caseId: string) => {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId);
    } else {
      newSelected.add(caseId);
    }
    setSelectedCases(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedCases.size === filteredCases.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(filteredCases.map(c => c.id)));
    }
  };

  const filteredCases = useMemo(() => {
    if (!search) return cases;
    const searchLower = search.toLowerCase();
    return cases.filter(c =>
      c.claim_id.toLowerCase().includes(searchLower) ||
      c.surrogate_name?.toLowerCase().includes(searchLower) ||
      c.first_parent_name?.toLowerCase().includes(searchLower) ||
      c.case_type.toLowerCase().includes(searchLower)
    );
  }, [cases, search]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Cases</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={loadCases}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium"
            >
              🔄 Refresh
            </button>
            <Link
              href="/cases/new"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
            >
              + Add
            </Link>
            {selectedCases.size > 0 && (
              <button
                onClick={() => {
                  // Handle bulk edit
                  alert(`Edit ${selectedCases.size} cases`);
                }}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
            >
              🔍
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading cases...</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCases.size === filteredCases.length && filteredCases.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                      Claim ID ↕
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Surrogate/Donor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Parent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Second Parent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                      Type ↕
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                      Manager ↕
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                      Current Step ↕
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                        No cases found
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedCases.has(c.id)}
                            onChange={() => toggleSelectCase(c.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {c.claim_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {c.surrogate_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {c.first_parent_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {c.second_parent_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {c.case_type}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/cases/${c.id}`}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                            >
                              📄 Detail
                            </Link>
                            <Link
                              href={`/cases/${c.id}/update-step`}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-800 text-white text-xs rounded"
                            >
                              Update Step
                            </Link>
                            <Link
                              href={`/cases/${c.id}/admin-update`}
                              className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded"
                            >
                              Admin Update
                            </Link>
                            <Link
                              href={`/cases/${c.id}/step-status`}
                              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
                            >
                              Step Status
                            </Link>
                            <Link
                              href={`/cases/${c.id}/edit`}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                            >
                              ✏️
                            </Link>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {c.manager_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="max-w-xs truncate" title={c.current_step || ''}>
                            {c.current_step || '—'}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Show {filteredCases.length > 0 ? 1 : 0} To {filteredCases.length} Records. Total {filteredCases.length} Records
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
