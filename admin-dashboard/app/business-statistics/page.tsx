'use client';

import { useEffect, useState } from 'react';

type Statistics = {
  transplantSuccessRate: {
    total: number;
    successful: number;
    rate: number;
  };
  clientAgeRanges: Record<string, number>;
  surrogateAgeRanges?: Record<string, number>;
  embryoGrades: Record<string, number>;
  transferCounts: {
    total: number;
    breakdown: Record<number, number>;
  };
};

type Filters = {
  applied: {
    surrogateAgeRange: string | null;
    embryoGrade: string | null;
    surrogateLocation: string | null;
    surrogateRace: string | null;
    ivfClinic: string | null;
    eggDonation: string | null;
    spermDonation: string | null;
    clientLocation: string | null;
    transferNumber: string | null;
  };
  available: {
    surrogateAgeRanges: string[];
    embryoGrades: string[];
    surrogateLocations: string[];
    surrogateRaces: string[];
    ivfClinics: string[];
    clientLocations: string[];
  };
};

export default function BusinessStatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [selectedSurrogateAgeRange, setSelectedSurrogateAgeRange] = useState<string>('');
  const [selectedEmbryoGrade, setSelectedEmbryoGrade] = useState<string>('');
  const [selectedSurrogateLocation, setSelectedSurrogateLocation] = useState<string>('');
  const [selectedSurrogateRace, setSelectedSurrogateRace] = useState<string>('');
  const [selectedIvfClinic, setSelectedIvfClinic] = useState<string>('');
  const [selectedEggDonation, setSelectedEggDonation] = useState<string>('');
  const [selectedSpermDonation, setSelectedSpermDonation] = useState<string>('');
  const [selectedClientLocation, setSelectedClientLocation] = useState<string>('');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Build query string with filters
      const params = new URLSearchParams();
      if (selectedSurrogateAgeRange) params.append('surrogate_age_range', selectedSurrogateAgeRange);
      if (selectedEmbryoGrade) params.append('embryo_grade', selectedEmbryoGrade);
      if (selectedSurrogateLocation) params.append('surrogate_location', selectedSurrogateLocation);
      if (selectedSurrogateRace) params.append('surrogate_race', selectedSurrogateRace);
      if (selectedIvfClinic) params.append('ivf_clinic', selectedIvfClinic);
      if (selectedEggDonation) params.append('egg_donation', selectedEggDonation);
      if (selectedSpermDonation) params.append('sperm_donation', selectedSpermDonation);
      if (selectedClientLocation) params.append('client_location', selectedClientLocation);
      
      const queryString = params.toString();
      const url = `/api/business-statistics${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Failed to load statistics: ${res.statusText}`);
      }
      const data = await res.json();
      setStatistics(data.statistics);
      setFilters(data.filters);
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      alert(`Failed to load statistics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedSurrogateAgeRange('');
    setSelectedEmbryoGrade('');
    setSelectedSurrogateLocation('');
    setSelectedSurrogateRace('');
    setSelectedIvfClinic('');
    setSelectedEggDonation('');
    setSelectedSpermDonation('');
    setSelectedClientLocation('');
    // Statistics will reload automatically via useEffect
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTotalForRecord = (record: Record<string, number>) => {
    return Object.values(record).reduce((sum, val) => sum + val, 0);
  };

  useEffect(() => {
    // Debounce filter changes
    const timer = setTimeout(() => {
      loadStatistics();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurrogateAgeRange, selectedEmbryoGrade, selectedSurrogateLocation, selectedSurrogateRace, selectedIvfClinic, selectedEggDonation, selectedSpermDonation, selectedClientLocation]);

  const exportToCSV = () => {
    if (!statistics) return;

    const rows: string[][] = [];
    
    // Header
    rows.push(['Business Statistics Report']);
    rows.push(['Generated:', new Date().toLocaleString()]);
    if (filters?.applied) {
      const appliedFilters = Object.entries(filters.applied)
        .filter(([_, value]) => value !== null)
        .map(([key, value]) => `${key}: ${value}`);
      if (appliedFilters.length > 0) {
        rows.push(['Applied Filters:', appliedFilters.join(', ')]);
      }
    }
    rows.push([]);

    // Transplant Success Rate
    rows.push(['Transplant Success Rate']);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Transfers', statistics.transplantSuccessRate.total.toString()]);
    rows.push(['Successful Transfers', statistics.transplantSuccessRate.successful.toString()]);
    rows.push(['Success Rate', `${statistics.transplantSuccessRate.rate.toFixed(2)}%`]);
    rows.push([]);

    // Surrogate Age Ranges
    if (statistics.surrogateAgeRanges) {
      rows.push(['Surrogate Age Ranges']);
      rows.push(['Age Range', 'Count']);
      Object.entries(statistics.surrogateAgeRanges).forEach(([range, count]) => {
        rows.push([`${range} years`, count.toString()]);
      });
      rows.push(['Total', getTotalForRecord(statistics.surrogateAgeRanges).toString()]);
      rows.push([]);
    }

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
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
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

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Surrogate Age Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Surrogate Age
              </label>
              <select
                value={selectedSurrogateAgeRange}
                onChange={(e) => {
                  setSelectedSurrogateAgeRange(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {filters?.available.surrogateAgeRanges.map(range => (
                  <option key={range} value={range}>{range} years</option>
                ))}
              </select>
            </div>

            {/* Embryo Grade Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Embryo Grade
              </label>
              <select
                value={selectedEmbryoGrade}
                onChange={(e) => {
                  setSelectedEmbryoGrade(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {filters?.available.embryoGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            {/* Surrogate Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Surrogate Location
              </label>
              <select
                value={selectedSurrogateLocation}
                onChange={(e) => {
                  setSelectedSurrogateLocation(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {filters?.available.surrogateLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            {/* Surrogate Race Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Surrogate Race
              </label>
              <select
                value={selectedSurrogateRace}
                onChange={(e) => {
                  setSelectedSurrogateRace(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {filters?.available.surrogateRaces.map(race => (
                  <option key={race} value={race}>{race}</option>
                ))}
              </select>
            </div>

            {/* IVF Clinic Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IVF Clinic
              </label>
              <select
                value={selectedIvfClinic}
                onChange={(e) => {
                  setSelectedIvfClinic(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {filters?.available.ivfClinics.map(clinic => (
                  <option key={clinic} value={clinic}>{clinic}</option>
                ))}
              </select>
            </div>

            {/* Egg Donation Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Egg Donation
              </label>
              <select
                value={selectedEggDonation}
                onChange={(e) => {
                  setSelectedEggDonation(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Sperm Donation Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sperm Donation
              </label>
              <select
                value={selectedSpermDonation}
                onChange={(e) => {
                  setSelectedSpermDonation(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Client Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Location
              </label>
              <select
                value={selectedClientLocation}
                onChange={(e) => {
                  setSelectedClientLocation(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {filters?.available.clientLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(selectedSurrogateAgeRange || selectedEmbryoGrade || selectedSurrogateLocation || selectedSurrogateRace || selectedIvfClinic || selectedEggDonation || selectedSpermDonation || selectedClientLocation) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  clearFilters();
                  setTimeout(loadStatistics, 100);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Active Filters Display */}
          {filters?.applied && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Active Filters:</span>
                {Object.entries(filters.applied)
                  .filter(([_, value]) => value !== null)
                  .map(([key, value]) => (
                    <span key={key} className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {key}: {value}
                    </span>
                  ))}
                {Object.values(filters.applied).every(v => v === null) && (
                  <span className="text-gray-400">No filters applied</span>
                )}
              </div>
            </div>
          )}
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

        {/* Surrogate Age Ranges Table - Only show if no age filter is applied */}
        {statistics.surrogateAgeRanges && !selectedSurrogateAgeRange && (
          <div className="border-b">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold">Surrogate Age Ranges</h2>
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
                {Object.entries(statistics.surrogateAgeRanges).map(([range, count], index) => {
                  const total = getTotalForRecord(statistics.surrogateAgeRanges!);
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTotalForRecord(statistics.surrogateAgeRanges!)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

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

