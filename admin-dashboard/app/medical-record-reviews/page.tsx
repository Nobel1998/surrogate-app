'use client';

import { useEffect, useMemo, useState } from 'react';
import { uploadMedicalRecordPdfToSignedUrl } from '@/lib/uploadMedicalRecordPdf';
import { generateMedicalRecordReviewPDF } from '@/lib/generateMedicalRecordReviewPDF';

type Complication = {
  complication: string;
  page: number;
  note?: string;
};

type Review = {
  id: string;
  title: string | null;
  file_url: string | null;
  file_name: string | null;
  storage_path: string | null;
  surrogate_user_id: string | null;
  match_id: string | null;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'failed' | 'reviewed';
  complications: Complication[] | null;
  intro: string | null;
  summary: string | null;
  raw_ai_response: string | null;
  error_message: string | null;
  analyzed_at: string | null;
  reviewed_at: string | null;
  file_deleted_at: string | null;
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
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

  const getMatchLabel = (matchId: string | null) => {
    if (!matchId) return null;
    const match = matches.find((m) => m.id === matchId);
    if (!match) return matchId.slice(0, 8);
    return `${match.surrogate?.name || 'Surrogate'} / ${match.parent?.name || 'Parent'}`;
  };

  const handleDownloadReport = (review: Review) => {
    try {
      generateMedicalRecordReviewPDF(review, {
        surrogateName: review.surrogate_user_id ? getSurrogateName(review.surrogate_user_id) : null,
        matchLabel: getMatchLabel(review.match_id),
      });
    } catch (error: any) {
      alert(`Failed to generate report: ${error.message}`);
    }
  };

  const handleDownloadSourcePdf = async (review: Review) => {
    if (!review.file_url || review.file_url === 'pending' || review.file_deleted_at) return;
    try {
      setDownloadingPdfId(review.id);
      const res = await fetch(review.file_url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = review.file_name || `medical-record-${review.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Failed to download PDF: ${error.message}`);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      alert('Please select a PDF file');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const file = formData.file;

      const initRes = await fetch('/api/medical-record-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim() || null,
          file_name: file.name,
          content_type: file.type || 'application/pdf',
          file_size: file.size,
          surrogate_user_id: formData.surrogate_user_id || null,
          match_id: formData.match_id || null,
        }),
      });
      const initRaw = await initRes.text();
      let initData: any = null;
      try {
        initData = initRaw ? JSON.parse(initRaw) : null;
      } catch {
        throw new Error(`Upload init failed (${initRes.status}): ${initRaw.slice(0, 180)}`);
      }
      if (!initRes.ok) {
        throw new Error(initData?.error || `Upload init failed (${initRes.status})`);
      }

      if (!initData?.signedUrl || !initData?.path) {
        throw new Error('Upload init missing signed upload URL or storage path');
      }

      await uploadMedicalRecordPdfToSignedUrl(initData.signedUrl, file, (progress) => {
        setUploadProgress(progress.percentage);
      });

      const finalizeRes = await fetch(`/api/medical-record-reviews/${initData.reviewId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: initData.path }),
      });
      const finalizeRaw = await finalizeRes.text();
      let finalizeData: any = null;
      try {
        finalizeData = finalizeRaw ? JSON.parse(finalizeRaw) : null;
      } catch {
        throw new Error(`Finalize failed (${finalizeRes.status}): ${finalizeRaw.slice(0, 180)}`);
      }
      if (!finalizeRes.ok) {
        throw new Error(finalizeData?.error || `Finalize failed (${finalizeRes.status})`);
      }

      setShowUploadModal(false);
      setFormData({ title: '', surrogate_user_id: '', match_id: '', file: null });
      setSelectedId(finalizeData.review?.id || initData.reviewId || null);
      await loadData();
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const patchReviewInList = (review: Review) => {
    setReviews((prev) => {
      const idx = prev.findIndex((r) => r.id === review.id);
      if (idx < 0) return [review, ...prev];
      const next = [...prev];
      next[idx] = review;
      return next;
    });
  };

  const handleAnalyze = async (id: string) => {
    try {
      setAnalyzingId(id);

      const current = reviews.find((r) => r.id === id) || null;
      const formData = new FormData();

      // Avoid slow server→Supabase download: browser fetches the public PDF and posts it.
      if (current?.file_url && current.file_url !== 'pending' && !current.file_deleted_at) {
        try {
          const pdfRes = await fetch(current.file_url);
          if (!pdfRes.ok) {
            throw new Error(`Browser PDF fetch failed (${pdfRes.status})`);
          }
          const blob = await pdfRes.blob();
          formData.append('file', blob, current.file_name || 'medical-record.pdf');
        } catch {
          // Continue without file; server will try local temp / storage fallbacks.
        }
      }

      const res = await fetch(`/api/medical-record-reviews/${id}/analyze`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        throw new Error(data.error || 'Analyze failed');
      }

      // Mark local row as analyzing without full-page reload.
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 'analyzing', error_message: null, updated_at: new Date().toISOString() }
            : r
        )
      );

      const deadline = Date.now() + 45 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 4000));

        const statusRes = await fetch(`/api/medical-record-reviews/${id}`);
        const statusData = await statusRes.json().catch(() => ({}));
        const review = statusData?.review as Review | undefined;
        if (!review) continue;

        patchReviewInList(review);

        if (review.status === 'analyzed' || review.status === 'reviewed') {
          setSelectedId(id);
          return;
        }
        if (review.status === 'failed') {
          throw new Error(review.error_message || 'Analysis failed');
        }
      }

      throw new Error('Analysis is taking longer than expected. Please refresh the page in a few minutes.');
    } catch (error: any) {
      alert(`Review failed: ${error.message}`);
      // Soft refresh only the single review; avoid full-page load flicker.
      try {
        const statusRes = await fetch(`/api/medical-record-reviews/${id}`);
        const statusData = await statusRes.json().catch(() => ({}));
        if (statusData?.review) patchReviewInList(statusData.review);
      } catch {
        // ignore
      }
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
      // 404 is treated as already deleted (safe idempotent UX).
      if (!res.ok && res.status !== 404) throw new Error(data.error || 'Delete failed');
      if (selectedId === id) setSelectedId(null);
      await loadData();
    } catch (error: any) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  const complications = Array.isArray(selected?.complications) ? selected!.complications : [];
  const selectedHasPdf = !!(
    selected &&
    selected.storage_path &&
    selected.storage_path !== 'pending' &&
    selected.file_url &&
    selected.file_url !== 'pending' &&
    !selected.file_deleted_at
  );
  const selectedUploadIncomplete = !!(
    selected &&
    !selected.file_deleted_at &&
    (selected.file_url === 'pending' || selected.storage_path === 'pending')
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Medical Record Reviews</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload medical PDFs and extract complications with page numbers.
            PDFs are deleted from storage after a successful review to save space.
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
                  <th className="px-4 py-3">Download</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
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
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadReport(review);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Report
                        </button>
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
                Select a record to view findings.
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

                {selectedUploadIncomplete && (
                  <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded">
                    PDF upload did not finish. Delete this record and upload the file again.
                  </div>
                )}

                {selected.error_message && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded">
                    {selected.error_message}
                  </div>
                )}

                {selected.file_deleted_at && (
                  <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded">
                    PDF deleted after review to save storage space. Findings below are kept.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedHasPdf ? (
                    <a
                      href={selected.file_url!}
                      target="_blank"
                      rel="noreferrer"
                      className="border px-3 py-2 rounded hover:bg-gray-50 text-sm"
                    >
                      Open PDF
                    </a>
                  ) : (
                    <span className="border px-3 py-2 rounded text-sm text-gray-400 cursor-not-allowed">
                      PDF removed
                    </span>
                  )}
                  <button
                    onClick={() => handleDownloadReport(selected)}
                    className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    Download Review Report
                  </button>
                  {selectedHasPdf && (
                    <button
                      onClick={() => handleDownloadSourcePdf(selected)}
                      disabled={downloadingPdfId === selected.id}
                      className="border px-3 py-2 rounded hover:bg-gray-50 text-sm disabled:opacity-50"
                    >
                      {downloadingPdfId === selected.id ? 'Downloading…' : 'Download Source PDF'}
                    </button>
                  )}
                  <button
                    onClick={() => handleAnalyze(selected.id)}
                    disabled={analyzingId === selected.id || !selectedHasPdf}
                    className="bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                    title={!selectedHasPdf ? 'PDF already deleted; re-upload to run again' : undefined}
                  >
                    {analyzingId === selected.id
                      ? 'Analyzing in background...'
                      : selected.status === 'analyzing'
                        ? 'Check Analysis Status'
                        : selected.status === 'failed'
                          ? 'Retry Review'
                          : 'Run Review'}
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
                    Delete Record
                  </button>
                </div>

                {selected.intro ? (
                  <div className="bg-gray-50 border rounded p-3">
                    <h3 className="font-medium mb-1">Introductory</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{selected.intro}</p>
                  </div>
                ) : null}

                <div>
                  <h3 className="font-medium mb-2">
                    Complications ({complications.length})
                  </h3>
                  {complications.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {selected.status === 'analyzed' || selected.status === 'reviewed'
                        ? 'No complications found.'
                        : 'Run review to extract complications.'}
                    </p>
                  ) : (
                    <table className="min-w-full text-sm border rounded overflow-hidden">
                      <thead className="bg-gray-50 text-left">
                        <tr>
                          <th className="px-3 py-2">Complication / Summary</th>
                          <th className="px-3 py-2 w-20">Page</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complications.map((item, index) => (
                          <tr key={`${item.page}-${item.complication}-${index}`} className="border-t">
                            <td className="px-3 py-2">
                              {item.complication}
                              {item.note ? (
                                <div className="text-xs text-gray-500 mt-1">{item.note}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 font-medium align-top">{item.page}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {selected.summary ? (
                  <div className="bg-gray-50 border rounded p-3">
                    <h3 className="font-medium mb-1">Overall Summary</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {selected.summary}
                    </p>
                  </div>
                ) : null}
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
              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Uploading to storage…</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, uploadProgress)}%` }}
                    />
                  </div>
                </div>
              )}
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
                  {uploading ? `Uploading… ${Math.round(uploadProgress)}%` : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
