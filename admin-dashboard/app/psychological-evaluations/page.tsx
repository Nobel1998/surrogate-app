'use client';

import { useEffect, useState } from 'react';

type Evaluation = {
  id: string;
  user_id: string;
  match_id: string | null;
  evaluation_date: string;
  evaluator_name: string | null;
  report_url: string;
  file_name: string | null;
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

export default function PsychologicalEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [surrogates, setSurrogates] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterMatchStatus, setFilterMatchStatus] = useState<string>('all');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    user_id: '',
    match_id: '',
    evaluation_date: '',
    evaluator_name: '',
    notes: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadData();
  }, [filterUserId, filterMatchStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load surrogates and matches
      const matchesRes = await fetch('/api/matches/options');
      if (!matchesRes.ok) {
        throw new Error(`Failed to load data: ${matchesRes.statusText}`);
      }
      const matchesData = await matchesRes.json();
      
      const surList = (matchesData.profiles || []).filter(
        (p: Profile) => (p.role || '').toLowerCase() === 'surrogate'
      );
      setSurrogates(surList);

      // Load matches and enrich with surrogate and parent names
      const matchesList = matchesData.matches || [];
      const profiles = matchesData.profiles || [];
      
      const profilesMap = new Map<string, Profile>(profiles.map((p: Profile) => [p.id, p]));
      
      const enrichedMatches = matchesList
        .map((match: any) => {
          const surrogate: Profile | undefined = profilesMap.get(match.surrogate_id);
          const parent: Profile | undefined = profilesMap.get(match.parent_id);
          
          return {
            ...match,
            surrogate: surrogate ? {
              id: surrogate.id,
              name: surrogate.name,
              phone: surrogate.phone,
            } : undefined,
            parent: parent ? {
              id: parent.id,
              name: parent.name,
              phone: parent.phone,
            } : undefined,
          };
        });
      
      setMatches(enrichedMatches);

      // Load evaluations
      const evaluationsRes = await fetch('/api/psychological-evaluations');
      if (!evaluationsRes.ok) {
        throw new Error(`Failed to load evaluations: ${evaluationsRes.statusText}`);
      }
      const evaluationsData = await evaluationsRes.json();
      
      let records = evaluationsData.evaluations || [];
      
      // Create a map of matches by id for quick lookup
      const matchesMap = new Map<string, Match>(enrichedMatches.map((m: Match) => [m.id, m]));

      // Enrich with user names and match info
      records = records.map((record: Evaluation) => {
        const user = surList.find((s: Profile) => s.id === record.user_id);
        const match: Match | undefined = record.match_id ? matchesMap.get(record.match_id) : undefined;
        return {
          ...record,
          user: user ? { id: user.id, name: user.name, phone: user.phone } : undefined,
          match: match ? { id: match.id, status: match.status } : undefined,
        };
      });

      // Apply filters
      if (filterUserId !== 'all') {
        records = records.filter((r: Evaluation) => r.user_id === filterUserId);
      }
      if (filterMatchStatus !== 'all') {
        records = records.filter((r: Evaluation) => {
          if (!r.match_id) return false; // No match = don't show when filtering by status
          const match = matchesMap.get(r.match_id);
          return match && match.status === filterMatchStatus;
        });
      }

      setEvaluations(records);
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const handleAdd = () => {
    setFormData({
      user_id: '',
      match_id: '',
      evaluation_date: '',
      evaluator_name: '',
      notes: '',
      file: null,
    });
    setShowAddModal(true);
  };

  const handleEdit = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setFormData({
      user_id: evaluation.user_id,
      match_id: evaluation.match_id || '',
      evaluation_date: evaluation.evaluation_date ? evaluation.evaluation_date.split('T')[0] : '',
      evaluator_name: evaluation.evaluator_name || '',
      notes: evaluation.notes || '',
      file: null,
    });
    setShowEditModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, file });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedEvaluation) {
      // Update existing evaluation
      try {
        const res = await fetch('/api/psychological-evaluations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedEvaluation.id,
            evaluation_date: formData.evaluation_date,
            evaluator_name: formData.evaluator_name,
            notes: formData.notes,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update evaluation');
        }

        alert('Evaluation updated successfully');
        setShowEditModal(false);
        setSelectedEvaluation(null);
        loadData();
      } catch (error: any) {
        console.error('Error updating evaluation:', error);
        alert(`Failed to update evaluation: ${error.message}`);
      }
    } else {
      // Create new evaluation
      if (!formData.file) {
        alert('Please select a file to upload');
        return;
      }

      try {
        setUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.file);
        uploadFormData.append('user_id', formData.user_id);
        if (formData.match_id) uploadFormData.append('match_id', formData.match_id);
        uploadFormData.append('evaluation_date', formData.evaluation_date);
        if (formData.evaluator_name) uploadFormData.append('evaluator_name', formData.evaluator_name);
        if (formData.notes) uploadFormData.append('notes', formData.notes);

        const res = await fetch('/api/psychological-evaluations', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to upload evaluation');
        }

        alert('Evaluation uploaded successfully');
        setShowAddModal(false);
        loadData();
      } catch (error: any) {
        console.error('Error uploading evaluation:', error);
        alert(`Failed to upload evaluation: ${error.message}`);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this psychological evaluation?')) {
      return;
    }

    try {
      const res = await fetch(`/api/psychological-evaluations?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete evaluation');
      }

      alert('Evaluation deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting evaluation:', error);
      alert(`Failed to delete evaluation: ${error.message}`);
    }
  };

  const handleViewReport = (reportUrl: string) => {
    window.open(reportUrl, '_blank');
  };

  const filteredEvaluations = evaluations;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Psychological Evaluations</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Evaluation
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
        <div>
          <label className="block text-sm font-medium mb-1">Filter by Match Status</label>
          <select
            value={filterMatchStatus}
            onChange={(e) => setFilterMatchStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Total Evaluations</div>
          <div className="text-2xl font-bold">{filteredEvaluations.length}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">This Month</div>
          <div className="text-2xl font-bold">
            {filteredEvaluations.filter((e) => {
              const evalDate = new Date(e.evaluation_date);
              const now = new Date();
              return evalDate.getMonth() === now.getMonth() && evalDate.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No psychological evaluations found</div>
      ) : (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Surrogate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evaluation Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evaluator</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvaluations.map((evaluation) => (
                <tr key={evaluation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{evaluation.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(evaluation.evaluation_date)}</td>
                  <td className="px-4 py-3 text-sm">{evaluation.evaluator_name || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleViewReport(evaluation.report_url)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {evaluation.file_name || 'View Report'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleEdit(evaluation)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(evaluation.id)}
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
            <h2 className="text-xl font-bold mb-4">Add Psychological Evaluation</h2>
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
                  <label className="block text-sm font-medium mb-1">Match (Optional)</label>
                  <select
                    value={formData.match_id}
                    onChange={(e) => {
                      const selectedMatchId = e.target.value;
                      const selectedMatch = matches.find((m) => m.id === selectedMatchId);
                      setFormData({
                        ...formData,
                        match_id: selectedMatchId,
                        user_id: selectedMatch?.surrogate_id || formData.user_id,
                      });
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">No Match</option>
                    {matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.surrogate?.name || 'Surrogate'} ↔ {match.parent?.name || 'Parent'} ({match.id.substring(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Evaluation Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.evaluation_date}
                    onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Evaluator Name</label>
                  <input
                    type="text"
                    value={formData.evaluator_name}
                    onChange={(e) => setFormData({ ...formData, evaluator_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Evaluator name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Report File *</label>
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Accepted formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG</p>
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
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
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
            <h2 className="text-xl font-bold mb-4">Edit Psychological Evaluation</h2>
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
                  <label className="block text-sm font-medium mb-1">Match (Optional)</label>
                  <select
                    value={formData.match_id}
                    onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">No Match</option>
                    {matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.surrogate?.name || 'Surrogate'} ↔ {match.parent?.name || 'Parent'} ({match.id.substring(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Evaluation Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.evaluation_date}
                    onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Evaluator Name</label>
                  <input
                    type="text"
                    value={formData.evaluator_name}
                    onChange={(e) => setFormData({ ...formData, evaluator_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Evaluator name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Current Report</label>
                  {selectedEvaluation && (
                    <button
                      type="button"
                      onClick={() => handleViewReport(selectedEvaluation.report_url)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {selectedEvaluation.file_name || 'View Current Report'}
                    </button>
                  )}
                  <p className="text-xs text-gray-500 mt-1">To replace the report, delete and create a new evaluation</p>
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
                    setSelectedEvaluation(null);
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

