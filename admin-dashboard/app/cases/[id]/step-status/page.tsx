'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type CaseStep = {
  id: string;
  case_id: string;
  stage_number: number;
  stage_name: string;
  step_number: number;
  step_name: string;
  status: string;
  completed_at?: string | null;
  completed_by?: string | null;
  notes?: string | null;
};

type CaseDetail = {
  id: string;
  claim_id: string;
  surrogate?: any;
};

const DEFAULT_STAGES = [
  {
    stage_number: 1,
    stage_name: 'Apply to be a surrogate',
    steps: [
      { step_number: 1, step_name: 'Application submitted' },
      { step_number: 2, step_name: 'Interview with agency' },
      { step_number: 3, step_name: 'Collect medical records' },
    ],
  },
  {
    stage_number: 2,
    stage_name: 'Ready for match',
    steps: [
      { step_number: 4, step_name: 'Waiting to be matched' },
    ],
  },
  {
    stage_number: 3,
    stage_name: 'Complete a match',
    steps: [
      { step_number: 5, step_name: 'Video Chat with IP/Surrogate' },
    ],
  },
];

export default function StepStatusPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [steps, setSteps] = useState<CaseStep[]>([]);
  const [adminUpdate, setAdminUpdate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      loadData();
    }
  }, [caseId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, stepsRes] = await Promise.all([
        fetch(`/api/cases/${caseId}`),
        fetch(`/api/cases/${caseId}/steps`),
      ]);

      if (!caseRes.ok) throw new Error('Failed to load case');
      if (!stepsRes.ok) throw new Error('Failed to load steps');

      const caseData = await caseRes.json();
      const stepsData = await stepsRes.json();

      setCaseData(caseData.case);
      setSteps(stepsData.steps || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateStepStatus = async (stageNumber: number, stepNumber: number, status: string) => {
    try {
      const stage = DEFAULT_STAGES.find(s => s.stage_number === stageNumber);
      const step = stage?.steps.find(s => s.step_number === stepNumber);

      const res = await fetch(`/api/cases/${caseId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_number: stageNumber,
          stage_name: stage?.stage_name || `Stage ${stageNumber}`,
          step_number: stepNumber,
          step_name: step?.step_name || `Step ${stepNumber}`,
          status,
        }),
      });

      if (!res.ok) throw new Error('Failed to update step');

      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update step');
    }
  };

  const saveAdminUpdate = async () => {
    if (!adminUpdate.trim()) {
      alert('Please enter an update');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_type: 'admin_note',
          title: 'Admin Update',
          content: adminUpdate,
        }),
      });

      if (!res.ok) throw new Error('Failed to save update');

      setAdminUpdate('');
      await loadData();
      alert('Update saved successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to save update');
    } finally {
      setSaving(false);
    }
  };

  const getStepStatus = (stageNumber: number, stepNumber: number): string => {
    const step = steps.find(
      s => s.stage_number === stageNumber && s.step_number === stepNumber
    );
    return step?.status || 'pending';
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'skipped':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading step status...</div>
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Update Status</h1>
            <Link
              href={`/cases/${caseId}`}
              className="text-white hover:text-gray-200"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Step Status Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Step Status</h2>
          
          {DEFAULT_STAGES.map((stage) => (
            <div key={stage.stage_number} className="mb-6 last:mb-0">
              <div className="bg-gray-100 px-4 py-3 mb-3 rounded">
                <h3 className="font-semibold text-gray-900">{stage.stage_name}</h3>
              </div>
              <div className="border-t border-gray-200 pt-3">
                {stage.steps.map((step) => {
                  const currentStatus = getStepStatus(stage.stage_number, step.step_number);
                  return (
                    <div key={step.step_number} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">
                            Step {step.step_number} {step.step_name}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs border ${getStepStatusColor(currentStatus)}`}>
                            {currentStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStepStatus(stage.stage_number, step.step_number, 'in_progress')}
                            className={`px-3 py-1 text-xs rounded ${
                              currentStatus === 'in_progress'
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => updateStepStatus(stage.stage_number, step.step_number, 'completed')}
                            className={`px-3 py-1 text-xs rounded ${
                              currentStatus === 'completed'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => updateStepStatus(stage.stage_number, step.step_number, 'skipped')}
                            className={`px-3 py-1 text-xs rounded ${
                              currentStatus === 'skipped'
                                ? 'bg-gray-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Admin Updates Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Updates:</h2>
          <textarea
            value={adminUpdate}
            onChange={(e) => setAdminUpdate(e.target.value)}
            placeholder="Enter admin update notes..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-4">
            <button
              onClick={saveAdminUpdate}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
