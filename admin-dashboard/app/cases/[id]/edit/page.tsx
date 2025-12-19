'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type CaseDetail = {
  id: string;
  claim_id: string;
  surrogate_id?: string | null;
  first_parent_id?: string | null;
  second_parent_id?: string | null;
  case_type: string;
  manager_id?: string | null;
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
  status: string;
  current_step?: string | null;
};

type Profile = {
  id: string;
  name?: string;
  phone?: string;
  role?: string;
};

export default function EditCasePage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [surrogates, setSurrogates] = useState<Profile[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, profilesRes] = await Promise.all([
        fetch(`/api/cases/${caseId}`),
        fetch('/api/matches/options'),
      ]);

      if (!caseRes.ok) throw new Error('Failed to load case');
      const caseData = await caseRes.json();
      setCaseData(caseData.case);

      // Format dates for input fields
      const formatDateForInput = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setFormData({
        claim_id: caseData.case.claim_id,
        surrogate_id: caseData.case.surrogate_id || '',
        first_parent_id: caseData.case.first_parent_id || '',
        second_parent_id: caseData.case.second_parent_id || '',
        case_type: caseData.case.case_type,
        manager_id: caseData.case.manager_id || '',
        weeks_pregnant: caseData.case.weeks_pregnant || 0,
        estimated_due_date: formatDateForInput(caseData.case.estimated_due_date),
        number_of_fetuses: caseData.case.number_of_fetuses || 0,
        fetal_beat_confirm: caseData.case.fetal_beat_confirm || 'None',
        sign_date: formatDateForInput(caseData.case.sign_date),
        transfer_date: formatDateForInput(caseData.case.transfer_date),
        beta_confirm_date: formatDateForInput(caseData.case.beta_confirm_date),
        due_date: formatDateForInput(caseData.case.due_date),
        clinic: caseData.case.clinic || '',
        embryos: caseData.case.embryos || '',
        lawyer: caseData.case.lawyer || '',
        company: caseData.case.company || '',
        status: caseData.case.status,
        current_step: caseData.case.current_step || '',
      });

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        const surList = (profilesData.profiles || []).filter(
          (p: Profile) => p.role?.toLowerCase() === 'surrogate'
        );
        const parList = (profilesData.profiles || []).filter(
          (p: Profile) => p.role?.toLowerCase() === 'parent'
        );
        setSurrogates(surList);
        setParents(parList);
      }
    } catch (err: any) {
      console.error('Error loading case data:', err);
      setError(err.message || 'Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update case');
      }

      router.push(`/cases/${caseId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update case');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading case data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">{error || 'Case not found'}</div>
          </div>
          <Link href="/cases" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            ← Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Case</h1>
          <Link
            href={`/cases/${caseId}`}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claim ID *
              </label>
              <input
                type="text"
                required
                value={formData.claim_id}
                onChange={(e) => setFormData({ ...formData, claim_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Type *
              </label>
              <select
                required
                value={formData.case_type}
                onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Surrogacy">Surrogacy</option>
                <option value="Egg Donation">Egg Donation</option>
                <option value="Embryo Donation">Embryo Donation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Surrogate/Donor
              </label>
              <select
                value={formData.surrogate_id}
                onChange={(e) => setFormData({ ...formData, surrogate_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Surrogate</option>
                {surrogates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.phone || s.id.substring(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Parent
              </label>
              <select
                value={formData.first_parent_id}
                onChange={(e) => setFormData({ ...formData, first_parent_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.phone || p.id.substring(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Parent
              </label>
              <select
                value={formData.second_parent_id}
                onChange={(e) => setFormData({ ...formData, second_parent_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.phone || p.id.substring(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Step
              </label>
              <input
                type="text"
                value={formData.current_step}
                onChange={(e) => setFormData({ ...formData, current_step: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., IVF clinic preview surrogate Medical records"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weeks Pregnant
              </label>
              <input
                type="number"
                min="0"
                value={formData.weeks_pregnant}
                onChange={(e) => setFormData({ ...formData, weeks_pregnant: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Fetuses
              </label>
              <input
                type="number"
                min="0"
                value={formData.number_of_fetuses}
                onChange={(e) => setFormData({ ...formData, number_of_fetuses: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fetal Beat Confirm
              </label>
              <select
                value={formData.fetal_beat_confirm}
                onChange={(e) => setFormData({ ...formData, fetal_beat_confirm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="None">None</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sign Date
              </label>
              <input
                type="date"
                value={formData.sign_date}
                onChange={(e) => setFormData({ ...formData, sign_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Date
              </label>
              <input
                type="date"
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beta Confirm Date
              </label>
              <input
                type="date"
                value={formData.beta_confirm_date}
                onChange={(e) => setFormData({ ...formData, beta_confirm_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Due Date
              </label>
              <input
                type="date"
                value={formData.estimated_due_date}
                onChange={(e) => setFormData({ ...formData, estimated_due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinic
              </label>
              <input
                type="text"
                value={formData.clinic}
                onChange={(e) => setFormData({ ...formData, clinic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Embryos
              </label>
              <input
                type="text"
                value={formData.embryos}
                onChange={(e) => setFormData({ ...formData, embryos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lawyer
              </label>
              <input
                type="text"
                value={formData.lawyer}
                onChange={(e) => setFormData({ ...formData, lawyer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href={`/cases/${caseId}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
