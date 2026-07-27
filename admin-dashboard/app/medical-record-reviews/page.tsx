'use client';

import { useEffect, useMemo, useState } from 'react';

type Complication = {
  complication: string;
  page: number;
  note?: string;
};

type Review = {
  id: string;
  title: string | null;
  file_url: string;
  file_name: string | null;
  storage_path: string;
  surrogate_user_id: string | null;
  match_id: string | null;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'failed' | 'reviewed';
  complications: Complication[] | null;
  raw_ai_response: string | null;
  error_message: string | null;
  analyzed_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

type Match = {
  id: string;
  surrogate_id: string;
  parent_id: string;
  status: string;
  surrogate?: { id: string; name: string; phone: string };
  parent?: { id: string; name: string; phone: string };
};

const STATUS_LABELS: Record<Review['status'], string> = {
  uploaded: 'Uploaded',
  analyzing: 'Analyzing',
  analyzed: 'Analyzed',
  failed: 'Failed',
  reviewed: 'Reviewed',
};

const STATUS_COLORS: Record<Review['status'], string> = {
  uploaded: 'bg-gray-100 text-gray-700',
  analyzing: 'bg-yellow-100 text-yellow-800',
  analyzed: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  reviewed: 'bg-green-100 text-green-800',
};

export default function MedicalRecordReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [surrogates, setSurrogates] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterQ, setFilterQ] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    surrogate_user_id: '',
    match_id: '',
    file: null as File | null,
  });

  const selected = useMemo(
    () => reviews.find((r) => r.id === selectedId) || null,
    [reviews, selectedId]
  );

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      const matchesRes = await fetch('/api/matches/options');
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        const profiles: Profile[] = matchesData.profiles || [];
        const surList = profiles.filter((p) => (p.role || '').toLowerCase() === 'surrogate');
        setSurrogates(surList);

        const profilesMap = new Map(profiles.map((p) => [p.id, p]));
        const enrichedMatches = (matchesData.matches || []).map((match: Match) => {
          const surrogate = profilesMap.get(match.surrogate_id);
          const parent = profilesMap.get(match.parent_id);
          return {
            ...match,
            surrogate: surrogate
              ? { id: surrogate.id, name: surrogate.name, phone: surrogate.phone }
              : undefined,
            parent: parent
              ? { id: parent.id, name: parent.name, phone: parent.phone }
              : undefined,
          };
        });
        setMatches(enrichedMatches);
      }

      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterQ.trim()) params.set('q', filterQ.trim());

      const reviewsRes = await fetch(`/api/medical-record-reviews?${params.toString()}`);
      if (!reviewsRes.ok) {
        const err = await reviewsRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load reviews');
      }
      const reviewsData = await reviewsRes.json();
      setReviews(reviewsData.reviews || []);
    } catch (error: any) {
      console.error('Error loading medical record reviews:', error);
      alert(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

  const getSurrogateName = (userId: string | null) => {
    if (!userId) return '—';
    return surrogates.find((s) => s.id === userId)?.name || userId.slice(0, 8);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      alert('Please select a PDF file');
      return;
    }

    try {
      setUploading(true);
      const body = new FormData();
      body.append('file', formData.file);
      if (formData.title.trim()) body.append('title', formData.title.trim());
      if (formData.surrogate_user_id) body.append('surrogate_user_id', formData.surrogate_user_id);
      if (formData.match_id) body.append('match_id', formData.match_id);

      const res = await fetch('/api/medical-record-reviews', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setShowUploadModal(false);
      setFormData({ title: '', surrogate_user_id: '', match_id: '', file: null });
      setSelectedId(data.review?.id || null);
      await loadData();
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      setAnalyzingId(id);
      const res = await fetch(`/api/medical-record-reviews/${id}/analyze`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analyze failed');
      await loadData();
      setSelectedId(id);
    } catch (error: any) {
      alert(`Kimi review failed: ${error.message}`);
      await loadData();
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleMarkReviewed = async (id: string) => {
    try {
      const res = await fetch(`/api/medical-record-reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reviewed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await loadData();
    } catch (error: any) {
      alert(`Failed to mark reviewed: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this medical record review and its PDF?')) return;
    try {
      const res = await fetch(`/api/medical-record-reviews/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      if (selectedId === id) setSelectedId(null);
      await loadData();
    } catch (error: any) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  const complications = Array.isArray(selected?.complications) ? selected!.complications : [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Medical Record Reviews</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload medical PDFs and run Kimi K3 to list complications with page numbers.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Upload PDF
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="uploaded">Uploaded</option>
            <option value="analyzing">Analyzing</option>
            <option value="analyzed">Analyzed</option>
            <option value="failed">Failed</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadData();
            }}
            placeholder="Title or file name"
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={loadData}
          className="border px-4 py-2 rounded hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Findings</th>
                  <th className="px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No medical record reviews yet.
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr
                      key={review.id}
                      onClick={() => setSelectedId(review.id)}
                      className={`border-t cursor-pointer hover:bg-blue-50 ${
                        selectedId === review.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{review.title || review.file_name || 'Untitled'}</div>
                        <div className="text-xs text-gray-500">
                          {getSurrogateName(review.surrogate_user_id)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[review.status]}`}>
                          {STATUS_LABELS[review.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {Array.isArray(review.complications) ? review.complications.length : 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {formatDateTime(review.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded shadow p-5 min-h-[420px]">
            {!selected ? (
              <div className="text-gray-500 h-full flex items-center justify-center">
                Select a record to view Kimi findings.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selected.title || selected.file_name || 'Medical Record'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Surrogate: {getSurrogateName(selected.surrogate_user_id)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {STATUS_LABELS[selected.status]}
                      {selected.analyzed_at ? ` · Analyzed ${formatDateTime(selected.analyzed_at)}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[selected.status]}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>

                {selected.error_message && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded">
                    {selected.error_message}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <a
                    href={selected.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="border px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    Open PDF
                  </a>
                  <button
                    onClick={() => handleAnalyze(selected.id)}
                    disabled={analyzingId === selected.id || selected.status === 'analyzing'}
                    className="bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {analyzingId === selected.id || selected.status === 'analyzing'
                      ? 'Running Kimi K3...'
                      : selected.status === 'failed'
                        ? 'Retry Kimi Review'
                        : 'Run Kimi Review'}
                  </button>
                  {(selected.status === 'analyzed' || selected.status === 'reviewed') && (
                    <button
                      onClick={() => handleMarkReviewed(selected.id)}
                      disabled={selected.status === 'reviewed'}
                      className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {selected.status === 'reviewed' ? 'Reviewed' : 'Mark as Reviewed'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="border border-red-300 text-red-700 px-3 py-2 rounded text-sm hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>

                <div>
                  <h3 className="font-medium mb-2">
                    Complications ({complications.length})
                  </h3>
                  {complications.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {selected.status === 'analyzed' || selected.status === 'reviewed'
                        ? 'No complications found.'
                        : 'Run Kimi review to extract complications.'}
                    </p>
                  ) : (
                    <table className="min-w-full text-sm border rounded overflow-hidden">
                      <thead className="bg-gray-50 text-left">
                        <tr>
                          <th className="px-3 py-2 w-20">Page</th>
                          <th className="px-3 py-2">Complication</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complications.map((item, index) => (
                          <tr key={`${item.page}-${item.complication}-${index}`} className="border-t">
                            <td className="px-3 py-2 font-medium">{item.page}</td>
                            <td className="px-3 py-2">
                              {item.complication}
                              {item.note ? (
                                <div className="text-xs text-gray-500 mt-1">{item.note}</div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Medical Record PDF</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title (optional)</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Jane Doe prenatal records"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Surrogate (optional)</label>
                <select
                  value={formData.surrogate_user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, surrogate_user_id: e.target.value, match_id: '' })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">—</option>
                  {surrogates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Match (optional)</label>
                <select
                  value={formData.match_id}
                  onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">—</option>
                  {matches
                    .filter(
                      (m) =>
                        !formData.surrogate_user_id || m.surrogate_id === formData.surrogate_user_id
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {(m.surrogate?.name || 'Surrogate') +
                          ' / ' +
                          (m.parent?.name || 'Parent') +
                          ` (${m.status})`}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PDF file *</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) =>
                    setFormData({ ...formData, file: e.target.files?.[0] || null })
                  }
                  className="w-full"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="border px-4 py-2 rounded hover:bg-gray-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
