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
  branch_id?: string | null;
  current_step?: string | null;
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
  files?: any;
  status: string;
  surrogate?: any;
  first_parent?: any;
  second_parent?: any;
  manager?: any;
};

type CaseUpdate = {
  id: string;
  update_type: string;
  title?: string | null;
  content?: string | null;
  amount?: number | null;
  status?: string | null;
  created_at: string;
  updated_by_user?: {
    id: string;
    name: string;
  } | null;
};

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [updates, setUpdates] = useState<CaseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      loadCaseDetail();
    }
  }, [caseId]);

  const loadCaseDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) {
        throw new Error('Failed to load case details');
      }
      const data = await res.json();
      setCaseData(data.case);
      setUpdates(data.updates || []);
    } catch (err: any) {
      console.error('Error loading case detail:', err);
      setError(err.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading case details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/cases" className="text-gray-600 hover:text-gray-900">
              ←
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{caseData.surrogate?.name || 'Case'}</h1>
          </div>
          <Link
            href={`/cases/${caseId}/edit`}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium"
          >
            Edit
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Case Overview */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Case Information</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-purple-700 mb-2">Intended Parent 1</div>
                  <div className="text-sm text-gray-900">
                    {caseData.first_parent?.name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-700 mb-2">Intended Parent 2</div>
                  <div className="text-sm text-gray-900">
                    {caseData.second_parent?.name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-700 mb-2">Surrogate</div>
                  <div className="text-sm text-gray-900">
                    {caseData.surrogate?.name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-700 mb-2">Clinic</div>
                  <div className="text-sm text-gray-900">{caseData.clinic || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-700 mb-2">Lawyer</div>
                  <div className="text-sm text-gray-900">{caseData.lawyer || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-700 mb-2">Embryos</div>
                  <div className="text-sm text-gray-900">{caseData.embryos || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-700 mb-2">Fund</div>
                  <div className="text-sm text-gray-900">—</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-700 mb-2">Agency Case Manager</div>
                  <div className="text-sm text-gray-900">
                    {caseData.manager?.name || '—'}
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <Link
                  href={`/cases/${caseId}/surrogate-info`}
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  View Surrogate Info
                </Link>
                <Link
                  href={`/cases/${caseId}/parent-info`}
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  View Parent Info
                </Link>
              </div>
            </div>
          </div>

          {/* Center Panel - Status and Progress */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Status</h2>
              <div className="mb-4">
                <div className="text-sm text-gray-700">
                  {caseData.current_step || 'No status set'}
                  {caseData.current_step?.includes('Medical') && (
                    <span className="ml-2 text-green-600">✓</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mb-6">
                <Link
                  href={`/cases/${caseId}/admin-update`}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                >
                  Admin Update
                </Link>
                <Link
                  href={`/cases/${caseId}/step-status`}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
                >
                  Step Status
                </Link>
              </div>

              {/* Progress Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-blue-600 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>

              {/* Important Dates */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sign Date:</span>
                  <span className="text-gray-900">{formatDate(caseData.sign_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transfer Date:</span>
                  <span className="text-gray-900">{formatDate(caseData.transfer_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Beta Confirm Date:</span>
                  <span className="text-gray-900">{formatDate(caseData.beta_confirm_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="text-gray-900">{formatDate(caseData.due_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Updates/Transactions Log */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Updates & Transactions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {updates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                          No updates yet
                        </td>
                      </tr>
                    ) : (
                      updates.map((update) => (
                        <tr key={update.id}>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {new Date(update.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900">
                            {update.amount ? `$${update.amount}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className={`px-2 py-1 rounded-full ${
                              update.status === 'Submitted' ? 'bg-green-100 text-green-800' :
                              update.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {update.status || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <button className="text-blue-600 hover:text-blue-800">
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
