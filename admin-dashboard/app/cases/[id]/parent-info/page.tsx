'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type ParentProfile = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  date_of_birth?: string;
  role?: string;
};

type CaseData = {
  id: string;
  first_parent_id?: string;
  second_parent_id?: string;
  parent_id?: string;
  first_parent?: ParentProfile;
  second_parent?: ParentProfile;
};

export default function ParentInfoPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [firstParent, setFirstParent] = useState<ParentProfile | null>(null);
  const [secondParent, setSecondParent] = useState<ParentProfile | null>(null);

  useEffect(() => {
    if (caseId) {
      loadParentInfo();
    }
  }, [caseId]);

  const loadParentInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) {
        throw new Error('Failed to load case');
      }
      const data = await res.json();
      setCaseData(data.case);
      setFirstParent(data.case?.first_parent || null);
      setSecondParent(data.case?.second_parent || null);
    } catch (err: any) {
      console.error('Error loading parent info:', err);
      setError(err.message || 'Failed to load parent information');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    return String(value);
  };

  const renderField = (label: string, value: any) => (
    <div className="py-2 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}:</span>
      <span className="ml-2 text-sm text-gray-900">{formatValue(value)}</span>
    </div>
  );

  const renderParentCard = (parent: ParentProfile | null, title: string) => {
    if (!parent) {
      return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          <p className="text-gray-500">No {title.toLowerCase()} assigned</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>👤</span> {title}
        </h3>
        {renderField('Name', parent.name)}
        {renderField('Phone', parent.phone)}
        {renderField('Email', parent.email)}
        {renderField('Location', parent.location)}
        {renderField('Date of Birth', parent.date_of_birth)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading parent information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
        <Link href="/matches" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Back to Matches
        </Link>
      </div>
    );
  }

  const hasAnyParent = firstParent || secondParent;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/matches" className="text-blue-600 hover:text-blue-800">
          ← Back to Matches
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Parent Information
      </h1>

      {!hasAnyParent ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">No parents assigned to this case yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderParentCard(firstParent, 'Intended Parent 1')}
          {renderParentCard(secondParent, 'Intended Parent 2')}
        </div>
      )}

      {/* Case Reference */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <p className="text-sm text-gray-600">
          Case ID: <span className="font-mono">{caseId}</span>
        </p>
        {caseData && (
          <p className="text-sm text-gray-500">
            Status: {caseData.id ? 'Active' : 'Unknown'}
          </p>
        )}
      </div>
    </div>
  );
}

