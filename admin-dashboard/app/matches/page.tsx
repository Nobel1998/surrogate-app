'use client';

import { useEffect, useMemo, useState } from 'react';

type Profile = {
  id: string;
  name?: string;
  // profiles 表无 email 字段，保持可选仅为兼容未来扩展
  email?: string;
  phone?: string;
  role?: string;
};

type Match = {
  id: string;
  surrogate_id: string;
  parent_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
};

const STATUS_OPTIONS = ['active', 'completed', 'cancelled', 'pending'];

export default function MatchesPage() {
  const [surrogates, setSurrogates] = useState<Profile[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSurrogate, setSelectedSurrogate] = useState<string>('');
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [status, setStatus] = useState<string>('active');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const profileLookup = useMemo(() => {
    const map: Record<string, Profile> = {};
    [...surrogates, ...parents].forEach((p) => {
      if (p.id) map[p.id] = p;
    });
    return map;
  }, [surrogates, parents]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/matches/options');
      if (!res.ok) {
        throw new Error(`Options request failed: ${res.status}`);
      }
      const { profiles = [], matches: matchData = [] } = await res.json();

      const surList = profiles.filter((p: Profile) => (p.role || '').toLowerCase() === 'surrogate');
      const parList = profiles.filter((p: Profile) => (p.role || '').toLowerCase() === 'parent');

      console.log('🧭 Matches loadData result', {
        allProfiles: profiles.length,
        surrogates: surList.length,
        parents: parList.length,
        matches: matchData?.length || 0,
        firstProfile: profiles?.[0],
        firstMatch: matchData?.[0],
      });

      setSurrogates(surList);
      setParents(parList);
      setMatches(matchData || []);
    } catch (err: any) {
      console.error('Error loading matches data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createMatch = async () => {
    if (!selectedSurrogate || !selectedParent) {
      alert('Please select both a surrogate and a parent.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/matches/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surrogate_id: selectedSurrogate,
          parent_id: selectedParent,
          status,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Create match failed: ${res.status} ${errText}`);
      }
      await loadData();
      setNotes('');
      alert('Match saved successfully');
    } catch (err: any) {
      console.error('Error creating match:', err);
      alert(err.message || 'Failed to create match');
    } finally {
      setSubmitting(false);
    }
  };

  const updateMatchStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/matches/options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Update status failed: ${res.status} ${errText}`);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading matches...</div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Matches</h1>
          <p className="text-gray-600">Pair parents with surrogates and manage their match status.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create / Update Match</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Surrogate</label>
              <select
                value={selectedSurrogate}
                onChange={(e) => setSelectedSurrogate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a surrogate</option>
                {surrogates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id} {s.phone ? `• ${s.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Parent</label>
              <select
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id} {p.phone ? `• ${p.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this match"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={createMatch}
              disabled={submitting}
              className={`px-4 py-2 rounded-md text-white font-medium ${submitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
            >
              {submitting ? 'Saving...' : 'Save Match'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Existing Matches</h2>
            <button
              onClick={loadData}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surrogate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.map((m) => {
                  const surrogate = profileLookup[m.surrogate_id];
                  const parent = profileLookup[m.parent_id];
                  return (
                    <tr key={m.id || `${m.surrogate_id}-${m.parent_id}`}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">{surrogate?.name || m.surrogate_id}</div>
                        <div className="text-xs text-gray-500">{surrogate?.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">{parent?.name || m.parent_id}</div>
                        <div className="text-xs text-gray-500">{parent?.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            m.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : m.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : m.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {m.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {m.updated_at ? new Date(m.updated_at).toLocaleString() : m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateMatchStatus(m.id, s)}
                            className={`px-2 py-1 rounded border text-xs ${
                              m.status === s
                                ? 'border-blue-500 text-blue-600'
                                : 'border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </td>
                    </tr>
                  );
                })}

                {matches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      No matches found. Create one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

