'use client';

import { useEffect, useState, useMemo } from 'react';

type ReferralSubmission = {
  id: string;
  referred_surrogate_name: string;
  referred_surrogate_phone: string;
  referred_surrogate_email: string | null;
  referral_type: string;
  notes: string | null;
  referrer_user_id: string;
  referrer_name: string;
  referrer_email: string;
  created_at: string;
};

export default function ReferralSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ReferralSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'surrogate' | 'potential_parent'>('all');
  const [search, setSearch] = useState('');

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/referral-submissions');
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load: ${res.status} ${errText}`);
      }
      const { submissions: data } = await res.json();
      setSubmissions(data || []);
    } catch (err: any) {
      console.error('Error loading referral submissions:', err);
      setError(err.message || 'Failed to load referral submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const filtered = useMemo(() => {
    let result = submissions;
    if (filterType !== 'all') {
      result = result.filter((s) => s.referral_type === filterType);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.referred_surrogate_name?.toLowerCase().includes(q) ||
          s.referred_surrogate_phone?.toLowerCase().includes(q) ||
          s.referred_surrogate_email?.toLowerCase().includes(q) ||
          s.referrer_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [submissions, filterType, search]);

  const typeLabel = (t: string) => {
    if (t === 'potential_parent') return 'Potential Parent';
    if (t === 'surrogate') return 'Surrogate';
    return t;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Loading referral submissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={loadSubmissions}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Referral Submissions</h1>
        <p className="text-gray-500 mt-1">
          Referrals submitted by surrogates and parents via the app.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="surrogate">Surrogate</option>
          <option value="potential_parent">Potential Parent</option>
        </select>
        <div className="text-sm text-gray-500 flex items-center ml-auto">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referred Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referred By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  No referral submissions found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {s.referred_surrogate_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {s.referred_surrogate_phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {s.referred_surrogate_email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.referral_type === 'surrogate'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {typeLabel(s.referral_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{s.referrer_name}</div>
                    {s.referrer_email && (
                      <div className="text-xs text-gray-400">{s.referrer_email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {s.notes || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(s.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
