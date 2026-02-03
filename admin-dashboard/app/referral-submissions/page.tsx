'use client';

import { useState, useEffect } from 'react';

interface Submission {
  id: string;
  referrer_user_id: string;
  referrer_name: string | null;
  referrer_email: string | null;
  referred_surrogate_name: string;
  referred_surrogate_phone: string;
  referred_surrogate_email: string | null;
  notes: string | null;
  created_at: string;
}

export default function ReferralSubmissionsPage() {
  const [list, setList] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/referral-submissions');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      setList(data.submissions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">推荐人信息 / Referral Submissions</h1>
      <p className="text-gray-600 mb-6">
        用户从 App「用户中心 → 登记介绍的孕妈信息」提交的介绍的孕妈信息，在此查看。
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">暂无提交记录。</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">提交时间</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">推荐人</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">推荐人邮箱</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">介绍的孕妈姓名</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">介绍的孕妈电话</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">介绍的孕妈邮箱</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {list.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{row.referrer_name || '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{row.referrer_email || '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">{row.referred_surrogate_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{row.referred_surrogate_phone}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{row.referred_surrogate_email || '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate" title={row.notes || ''}>
                    {row.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
