'use client';

import { useEffect, useMemo, useState } from 'react';

type Profile = {
  id: string;
  name?: string;
  // profiles 表无 email 字段，保持可选仅为兼容未来扩展
  email?: string;
  phone?: string;
  role?: string;
  progress_stage?: string | null;
  stage_updated_by?: string | null;
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

type Post = {
  id: string;
  user_id: string;
  content?: string | null;
  text?: string | null;
  media_url?: string | null;
  media_uri?: string | null;
  media_type?: string | null;
  stage?: string | null;
  created_at?: string | null;
};
type CommentRow = { id: string; post_id: string };
type LikeRow = { id: string; post_id: string };
type MedicalReport = {
  id: string;
  user_id: string;
  visit_date: string;
  provider_name?: string | null;
  stage: string;
  report_data: any;
  proof_image_url?: string | null;
  created_at: string;
};

const STATUS_OPTIONS = ['active', 'completed', 'cancelled', 'pending'];
const STAGE_OPTIONS = ['pre', 'pregnancy', 'ob_visit', 'delivery'];
const STAGE_LABELS: Record<string, string> = {
  'pre': 'Pre-Transfer',
  'pregnancy': 'Post-Transfer',
  'ob_visit': 'OB Office Visit',
  'delivery': 'Delivery',
};

export default function MatchesPage() {
  const [surrogates, setSurrogates] = useState<Profile[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [postLikes, setPostLikes] = useState<LikeRow[]>([]);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSurrogate, setSelectedSurrogate] = useState<string>('');
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [status, setStatus] = useState<string>('active');
  const [stage, setStage] = useState<string>('pre');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  
  // Contract upload state
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractMatchId, setContractMatchId] = useState<string | null>(null);
  const [contractSurrogateId, setContractSurrogateId] = useState<string>('');
  const [contractParentId, setContractParentId] = useState<string>('');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);

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
        const errText = await res.text();
        throw new Error(`Options request failed: ${res.status} ${errText || ''}`.trim());
      }
      const {
        profiles = [],
        matches: matchData = [],
        posts: postsData = [],
        comments: commentsData = [],
        postLikes: likesData = [],
        medicalReports: reportsData = [],
      } = await res.json();

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
      setPosts(postsData || []);
      setComments(commentsData || []);
      setPostLikes(likesData || []);
      setMedicalReports(reportsData || []);
      // default stage selection for form: if surrogate chosen, pick its stage
      if (selectedSurrogate) {
        const found = surList.find((s: Profile) => s.id === selectedSurrogate);
        if (found?.progress_stage) setStage(found.progress_stage);
      }
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

  const updateStage = async (surrogateId: string, newStage: string) => {
    try {
      const res = await fetch('/api/matches/options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surrogate_id: surrogateId, progress_stage: newStage, stage_updated_by: 'admin' }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Update stage failed: ${res.status} ${errText}`);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error updating stage:', err);
      alert(err.message || 'Failed to update stage');
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

  const openContractModal = (match: Match) => {
    setContractMatchId(match.id);
    setContractSurrogateId(match.surrogate_id);
    setContractParentId(match.parent_id);
    setContractFile(null);
    setShowContractModal(true);
  };

  const uploadContract = async () => {
    if (!contractFile) {
      alert('Please select a contract file');
      return;
    }
    if (!contractSurrogateId || !contractParentId) {
      alert('Surrogate and Parent IDs are required');
      return;
    }

    setUploadingContract(true);
    try {
      const formData = new FormData();
      formData.append('file', contractFile);
      formData.append('surrogate_id', contractSurrogateId);
      formData.append('parent_id', contractParentId);
      formData.append('contract_type', 'both');

      const res = await fetch('/api/matches/contracts', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Contract uploaded successfully! Both users can now see it in their My Match section.');
      setShowContractModal(false);
      setContractFile(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading contract:', err);
      alert(err.message || 'Failed to upload contract');
    } finally {
      setUploadingContract(false);
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
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSurrogate(val);
                  const found = surrogates.find((s) => s.id === val);
                  setStage(found?.progress_stage || 'pre');
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a surrogate</option>
                {surrogates.map((s: Profile) => (
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
                {STATUS_OPTIONS.map((s: string) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Surrogate Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STAGE_OPTIONS.map((s: string) => (
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
            <button
              onClick={() => {
                if (!selectedSurrogate) {
                  alert('Please select a surrogate to update stage.');
                  return;
                }
                updateStage(selectedSurrogate, stage);
              }}
              disabled={submitting || !selectedSurrogate}
              className={`ml-3 px-4 py-2 rounded-md text-blue-700 font-medium border ${submitting || !selectedSurrogate ? 'border-gray-300 text-gray-400' : 'border-blue-300 hover:border-blue-500'}`}
            >
              Update Stage
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.map((m) => {
                  const surrogate = profileLookup[m.surrogate_id];
                  const parent = profileLookup[m.parent_id];
                  const surrogateStageKey = surrogate?.progress_stage || 'pre';
                  const surrogateStage = STAGE_LABELS[surrogateStageKey] || surrogateStageKey.toUpperCase();
                  const stageUpdater = (surrogate?.stage_updated_by || 'admin').toUpperCase();
                  const surrogatePosts = posts.filter((p) => p.user_id === m.surrogate_id);
                  const latestPosts = surrogatePosts.slice(0, 3);
                  const commentCount = comments.filter((c) => surrogatePosts.some((p) => p.id === c.post_id)).length;
                  const likeCount = postLikes.filter((l) => surrogatePosts.some((p) => p.id === l.post_id)).length;
                  const surrogateReports = medicalReports.filter((r) => r.user_id === m.surrogate_id);
                  const latestReports = surrogateReports.slice(0, 3);
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
                        <div className="flex flex-col gap-1">
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
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
                              STAGE: {surrogateStage}
                            </span>
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                              BY: {stageUpdater}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        <div className="flex flex-col gap-2">
                          <div className="font-semibold text-sm">
                            Posts: {surrogatePosts.length} · Likes: {likeCount} · Comments: {commentCount}
                          </div>
                          {latestPosts.length === 0 ? (
                            <div className="text-gray-500 text-xs">No posts</div>
                          ) : (
                            latestPosts.map((p) => (
                              <div key={p.id} className="p-2 rounded border border-gray-200 bg-gray-50">
                                <div className="text-[11px] text-gray-500">
                                  {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                                  {p.stage ? ` · ${p.stage}` : ''}
                                </div>
                                <div className="text-sm text-gray-900 line-clamp-2">
                                  {p.content || p.text || '(no text)'}
                                </div>
                                {((p.media_url || p.media_uri) && (
                                  <a
                                    href={String(p.media_url || p.media_uri || '#')}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Media
                                  </a>
                                ))}
                              </div>
                            ))
                          )}
                          
                          <div className="mt-2 pt-2 border-t border-gray-300">
                            <div className="font-semibold text-sm text-green-700">
                              Medical Check-ins: {surrogateReports.length}
                            </div>
                            {latestReports.length === 0 ? (
                              <div className="text-gray-500 text-xs">No medical reports</div>
                            ) : (
                              latestReports.map((r) => {
                                const reportData = r.report_data || {};
                                const visitDate = r.visit_date ? new Date(r.visit_date).toLocaleDateString() : '';
                                let keyMetrics: string[] = [];
                                
                                if (r.stage === 'Pre-Transfer') {
                                  if (reportData.endometrial_thickness) keyMetrics.push(`Endometrial: ${reportData.endometrial_thickness}mm`);
                                  if (reportData.follicle_1_mm) keyMetrics.push(`Follicle: ${reportData.follicle_1_mm}mm`);
                                  if (reportData.labs && Array.isArray(reportData.labs) && reportData.labs.length > 0) {
                                    keyMetrics.push(`Labs: ${reportData.labs.slice(0, 2).join(', ')}`);
                                  }
                                } else if (r.stage === 'Post-Transfer') {
                                  if (reportData.fetal_heart_rate) keyMetrics.push(`HR: ${reportData.fetal_heart_rate}bpm`);
                                  if (reportData.gestational_sac_diameter) keyMetrics.push(`Sac: ${reportData.gestational_sac_diameter}mm`);
                                  if (reportData.beta_hcg) keyMetrics.push(`Beta HCG: ${reportData.beta_hcg}`);
                                } else if (r.stage === 'OBGYN') {
                                  if (reportData.weight) keyMetrics.push(`Weight: ${reportData.weight}lbs`);
                                  if (reportData.blood_pressure) keyMetrics.push(`BP: ${reportData.blood_pressure}`);
                                  if (reportData.fetal_heartbeats) keyMetrics.push(`FHR: ${reportData.fetal_heartbeats}bpm`);
                                }
                                
                                return (
                                  <div key={r.id} className="p-2 rounded border border-green-200 bg-green-50 mt-1">
                                    <div className="text-[11px] text-gray-600 font-semibold">
                                      {r.stage} · {visitDate}
                                      {r.provider_name && ` · ${r.provider_name}`}
                                    </div>
                                    {keyMetrics.length > 0 && (
                                      <div className="text-xs text-gray-700 mt-1">
                                        {keyMetrics.join(' · ')}
                                      </div>
                                    )}
                                    {r.proof_image_url && (
                                      <a
                                        href={r.proof_image_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                                      >
                                        📎 View Proof
                                      </a>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {m.updated_at ? new Date(m.updated_at).toLocaleString() : m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        {STATUS_OPTIONS.map((s: string) => (
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
                        <select
                          className="mt-2 border border-gray-300 rounded px-2 py-1 text-xs"
                          value={surrogate?.progress_stage || 'pre'}
                          onChange={(e) => updateStage(m.surrogate_id, e.target.value)}
                        >
                          {STAGE_OPTIONS.map((st: string) => (
                            <option key={st} value={st}>
                              {STAGE_LABELS[st] || st.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => openContractModal(m)}
                          className="mt-2 w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          📄 Publish Contract
                        </button>
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

      {/* Contract Upload Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Publish Contract</h3>
              <button
                onClick={() => setShowContractModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogate
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[contractSurrogateId]?.name || contractSurrogateId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[contractParentId]?.name || contractParentId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {contractFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {contractFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The same contract will be published for both parties. Each party will sign their own copy.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowContractModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadContract}
                  disabled={uploadingContract || !contractFile}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingContract || !contractFile
                      ? 'bg-gray-400'
                      : 'bg-green-600 hover:bg-green-700'
                  } transition-colors`}
                >
                  {uploadingContract ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

