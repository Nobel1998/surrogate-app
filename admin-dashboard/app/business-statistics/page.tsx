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
      const res = await fetch('/api/business-statistics');
      
      if (!res.ok) {
        throw new Error(`Failed to load statistics: ${res.statusText}`);
      }
      const data = await res.json();
      setStatistics(data.statistics);
    } catch (error: any) {
      console.error('Error loading statistics:', error);
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

  const exportToCSV = () => {
    if (!statistics) return;

    const rows: string[][] = [];
    
    // Header
    rows.push(['Business Statistics Report']);
    rows.push(['Generated:', new Date().toLocaleString()]);
    rows.push([]);

    // Transplant Success Rate
    rows.push(['Transplant Success Rate']);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Transfers', statistics.transplantSuccessRate.total.toString()]);
    rows.push(['Successful Transfers', statistics.transplantSuccessRate.successful.toString()]);
    rows.push(['Success Rate', `${statistics.transplantSuccessRate.rate.toFixed(2)}%`]);
    rows.push([]);

    // Client Age Ranges
    rows.push(['Client Age Ranges']);
    rows.push(['Age Range', 'Count']);
    Object.entries(statistics.clientAgeRanges).forEach(([range, count]) => {
      rows.push([`${range} years`, count.toString()]);
    });
    rows.push(['Total', getTotalForRecord(statistics.clientAgeRanges).toString()]);
    rows.push([]);

    // Embryo Grades
    rows.push(['Embryo Grades Distribution']);
    rows.push(['Grade', 'Count']);
    const sortedGrades = Object.entries(statistics.embryoGrades).sort(([, a], [, b]) => b - a);
    sortedGrades.forEach(([grade, count]) => {
      rows.push([grade, count.toString()]);
    });
    if (sortedGrades.length > 0) {
      rows.push(['Total', getTotalForRecord(statistics.embryoGrades).toString()]);
    }
    rows.push([]);

    // Transfer Counts
    rows.push(['Transfer Statistics']);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Transfers', statistics.transferCounts.total.toString()]);

    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `business-statistics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Business Statistics</h1>
          <p className="text-gray-600 mt-2">Performance metrics and statistics for client display</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to CSV
          </button>
          <button
            onClick={loadStatistics}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Transplant Success Rate Table */}
        <div className="border-b">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold">Transplant Success Rate</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Transfers</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{statistics.transplantSuccessRate.total}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Successful Transfers</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{statistics.transplantSuccessRate.successful}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Success Rate</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">{formatPercentage(statistics.transplantSuccessRate.rate)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Client Age Ranges Table */}
        <div className="border-b">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold">Client Age Ranges</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(statistics.clientAgeRanges).map(([range, count], index) => {
                const total = getTotalForRecord(statistics.clientAgeRanges);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <tr key={range} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{range} years</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPercentage(percentage)}</td>
                  </tr>
                );
              })}
              <tr className="bg-blue-50 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTotalForRecord(statistics.clientAgeRanges)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Embryo Grades Table */}
        <div className="border-b">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold">Embryo Grades Distribution</h2>
          </div>
          {Object.keys(statistics.embryoGrades).length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">No embryo grade data available</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(statistics.embryoGrades)
                  .sort(([, a], [, b]) => b - a)
                  .map(([grade, count], index) => {
                    const total = getTotalForRecord(statistics.embryoGrades);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <tr key={grade} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grade}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPercentage(percentage)}</td>
                      </tr>
                    );
                  })}
                <tr className="bg-blue-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTotalForRecord(statistics.embryoGrades)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">100.0%</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Transfer Statistics Table */}
        <div>
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold">Transfer Statistics</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Transfers</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{statistics.transferCounts.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

