'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Profile = {
  id: string;
  name?: string;
  phone?: string;
  role?: string;
};

type AdminUser = {
  id: string;
  name: string;
};

export default function NewCasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    claim_id: '',
    surrogate_id: '',
    first_parent_id: '',
    second_parent_id: '',
    case_type: 'Surrogacy',
    manager_id: '',
    weeks_pregnant: 0,
    estimated_due_date: '',
    number_of_fetuses: 0,
    fetal_beat_confirm: 'None',
    sign_date: '',
    transfer_date: '',
    beta_confirm_date: '',
    due_date: '',
    clinic: '',
    embryos: '',
    lawyer: '',
    company: '',
    status: 'active',
  });

  const [surrogates, setSurrogates] = useState<Profile[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    loadOptions();
    
    // Pre-fill from URL params if provided
    const surrogateId = searchParams.get('surrogate_id');
    const parentId = searchParams.get('parent_id');
    if (surrogateId) {
      setFormData(prev => ({ ...prev, surrogate_id: surrogateId }));
    }
    if (parentId) {
      setFormData(prev => ({ ...prev, first_parent_id: parentId }));
    }
  }, [searchParams]);

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      const [profilesRes, managersRes] = await Promise.all([
        fetch('/api/matches/options'),
        fetch('/api/admin/users'),
      ]);

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

      // Try to fetch managers (we'll create this API if needed)
      // For now, we'll skip it
    } catch (err) {
      console.error('Error loading options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.claim_id) {
      alert('Claim ID is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create case');
      }

      const data = await res.json();
      router.push(`/cases/${data.case.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Add New Case</h1>
          <Link
            href="/cases"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Cases
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
                Lawyer
              </label>
              <input
                type="text"
                value={formData.lawyer}
                onChange={(e) => setFormData({ ...formData, lawyer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/cases"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
