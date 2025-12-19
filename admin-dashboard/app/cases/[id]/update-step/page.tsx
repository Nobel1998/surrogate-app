'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type CaseDetail = {
  id: string;
  claim_id: string;
  surrogate?: any;
  current_step?: string | null;
};

export default function UpdateStepPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [currentStep, setCurrentStep] = useState('');
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
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error('Failed to load case');
      const data = await res.json();
      setCaseData(data.case);
      setCurrentStep(data.case.current_step || '');
    } catch (err: any) {
      console.error('Error loading case data:', err);
      setError(err.message || 'Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStep.trim()) {
      alert('Please enter a step description');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_step: currentStep,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update step');
      }

      // Also create an update record
      await fetch(`/api/cases/${caseId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_type: 'step',
          title: 'Step Updated',
          content: `Current step updated to: ${currentStep}`,
        }),
      });

      router.push(`/cases/${caseId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update step');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto">
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/cases/${caseId}`} className="text-gray-600 hover:text-gray-900">
              ←
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Update Step</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Step *
              </label>
              <input
                type="text"
                required
                value={currentStep}
                onChange={(e) => setCurrentStep(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., IVF clinic preview surrogate Medical records"
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the current step or status of this case
              </p>
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
                {saving ? 'Saving...' : 'Update Step'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
