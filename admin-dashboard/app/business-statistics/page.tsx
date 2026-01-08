'use client';

import { useEffect, useState } from 'react';

type Statistics = {
  transplantSuccessRate: {
    total: number;
    successful: number;
    rate: number;
  };
  clientAgeRanges: Record<string, number>;
  embryoGrades: Record<string, number>;
  transferCounts: {
    total: number;
    breakdown: Record<number, number>;
  };
};

export default function BusinessStatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/page.tsx:27',message:'Starting to load statistics',data:{timestamp:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      const res = await fetch('/api/business-statistics');
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/page.tsx:35',message:'API response received',data:{resOk:res.ok,resStatus:res.status,resStatusText:res.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      if (!res.ok) {
        const errorText = await res.text();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/page.tsx:40',message:'API error response',data:{errorText,status:res.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        throw new Error(`Failed to load statistics: ${res.statusText}`);
      }
      const data = await res.json();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/page.tsx:47',message:'Statistics data received',data:{hasStatistics:!!data.statistics,statistics:data.statistics},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      setStatistics(data.statistics);
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/page.tsx:52',message:'Error caught in loadStatistics',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      alert(`Failed to load statistics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTotalForRecord = (record: Record<string, number>) => {
    return Object.values(record).reduce((sum, val) => sum + val, 0);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading statistics...</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-gray-500">No statistics available</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Business Statistics</h1>
        <p className="text-gray-600 mt-2">Performance metrics and statistics for client display</p>
      </div>

      {/* Transplant Success Rate */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Transplant Success Rate</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Transfers</div>
            <div className="text-3xl font-bold text-blue-600">{statistics.transplantSuccessRate.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Successful Transfers</div>
            <div className="text-3xl font-bold text-green-600">{statistics.transplantSuccessRate.successful}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Success Rate</div>
            <div className="text-3xl font-bold text-purple-600">
              {formatPercentage(statistics.transplantSuccessRate.rate)}
            </div>
          </div>
        </div>
        {statistics.transplantSuccessRate.total > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${statistics.transplantSuccessRate.rate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Client Age Ranges */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Client Age Ranges</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(statistics.clientAgeRanges).map(([range, count]) => (
            <div key={range} className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{count}</div>
              <div className="text-sm text-gray-600 mt-1">{range} years</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Total Clients: {getTotalForRecord(statistics.clientAgeRanges)}
        </div>
      </div>

      {/* Embryo Grades */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Embryo Grades Distribution</h2>
        {Object.keys(statistics.embryoGrades).length === 0 ? (
          <div className="text-gray-500 text-center py-4">No embryo grade data available</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {Object.entries(statistics.embryoGrades)
                .sort(([, a], [, b]) => b - a)
                .map(([grade, count]) => {
                  const total = getTotalForRecord(statistics.embryoGrades);
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={grade} className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-800">{count}</div>
                      <div className="text-sm text-gray-600 mt-1">Grade {grade}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatPercentage(percentage)}</div>
                    </div>
                  );
                })}
            </div>
            <div className="text-sm text-gray-500">
              Total Embryos: {getTotalForRecord(statistics.embryoGrades)}
            </div>
          </>
        )}
      </div>

      {/* Transfer Counts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Transfer Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Transfers</div>
            <div className="text-3xl font-bold text-indigo-600">{statistics.transferCounts.total}</div>
          </div>
          <div className="bg-teal-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Active Matches with Transfers</div>
            <div className="text-3xl font-bold text-teal-600">{statistics.transferCounts.total}</div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={loadStatistics}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Refresh Statistics
        </button>
      </div>
    </div>
  );
}

