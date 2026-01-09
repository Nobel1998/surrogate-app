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
    signDateFrom: string | null;
    signDateTo: string | null;
    betaConfirmDateFrom: string | null;
    betaConfirmDateTo: string | null;
    fetalBeatDateFrom: string | null;
    fetalBeatDateTo: string | null;
    deliveryDateFrom: string | null;
    deliveryDateTo: string | null;
    embryoCount: string | null;
    surrogateBMI: string | null;
    surrogateBloodType: string | null;
    surrogateMaritalStatus: string | null;
    surrogateDeliveryHistory: string | null;
    surrogateMiscarriageHistory: string | null;
    previousSurrogacyExperience: string | null;
    clientMaritalStatus: string | null;
    clientBloodType: string | null;
    applicationStatus: string | null;
    obgynDoctor: string | null;
    deliveryHospital: string | null;
    transferNumber: string | null;
  };
  available: {
    surrogateAgeRanges: string[];
    embryoGrades: string[];
    surrogateLocations: string[];
    surrogateRaces: string[];
    ivfClinics: string[];
    clientLocations: string[];
    surrogateBloodTypes: string[];
    surrogateMaritalStatuses: string[];
    applicationStatuses: string[];
    bmiRanges: string[];
    deliveryHistoryOptions: string[];
    obgynDoctors: string[];
    deliveryHospitals: string[];
  };
};

export default function BusinessStatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter state - Basic
  const [selectedSurrogateAgeRange, setSelectedSurrogateAgeRange] = useState<string>('');
  const [selectedEmbryoGrade, setSelectedEmbryoGrade] = useState<string>('');
  const [selectedSurrogateLocation, setSelectedSurrogateLocation] = useState<string>('');
  const [selectedSurrogateRace, setSelectedSurrogateRace] = useState<string>('');
  const [selectedIvfClinic, setSelectedIvfClinic] = useState<string>('');
  const [selectedEggDonation, setSelectedEggDonation] = useState<string>('');
  const [selectedSpermDonation, setSelectedSpermDonation] = useState<string>('');
  const [selectedClientLocation, setSelectedClientLocation] = useState<string>('');
  
  // Filter state - Dates
  const [selectedSignDateFrom, setSelectedSignDateFrom] = useState<string>('');
  const [selectedSignDateTo, setSelectedSignDateTo] = useState<string>('');
  const [selectedBetaConfirmDateFrom, setSelectedBetaConfirmDateFrom] = useState<string>('');
  const [selectedBetaConfirmDateTo, setSelectedBetaConfirmDateTo] = useState<string>('');
  const [selectedFetalBeatDateFrom, setSelectedFetalBeatDateFrom] = useState<string>('');
  const [selectedFetalBeatDateTo, setSelectedFetalBeatDateTo] = useState<string>('');
  const [selectedDeliveryDateFrom, setSelectedDeliveryDateFrom] = useState<string>('');
  const [selectedDeliveryDateTo, setSelectedDeliveryDateTo] = useState<string>('');
  
  // Filter state - Surrogate Details
  const [selectedSurrogateBMI, setSelectedSurrogateBMI] = useState<string>('');
  const [selectedSurrogateBloodType, setSelectedSurrogateBloodType] = useState<string>('');
  const [selectedSurrogateMaritalStatus, setSelectedSurrogateMaritalStatus] = useState<string>('');
  const [selectedSurrogateDeliveryHistory, setSelectedSurrogateDeliveryHistory] = useState<string>('');
  const [selectedSurrogateMiscarriageHistory, setSelectedSurrogateMiscarriageHistory] = useState<string>('');
  const [selectedPreviousSurrogacyExperience, setSelectedPreviousSurrogacyExperience] = useState<string>('');
  const [selectedApplicationStatus, setSelectedApplicationStatus] = useState<string>('');
  const [selectedObgynDoctor, setSelectedObgynDoctor] = useState<string>('');
  const [selectedDeliveryHospital, setSelectedDeliveryHospital] = useState<string>('');
  
  // Filter state - Client Details
  const [selectedClientMaritalStatus, setSelectedClientMaritalStatus] = useState<string>('');
  const [selectedClientBloodType, setSelectedClientBloodType] = useState<string>('');
  
  // Filter state - Transfer Details
  const [selectedEmbryoCount, setSelectedEmbryoCount] = useState<string>('');
  
  // UI state for collapsible sections
  const [showBasicFilters, setShowBasicFilters] = useState<boolean>(true);
  const [showDateFilters, setShowDateFilters] = useState<boolean>(false);
  const [showSurrogateFilters, setShowSurrogateFilters] = useState<boolean>(false);
  const [showClientFilters, setShowClientFilters] = useState<boolean>(false);

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
      if (selectedSignDateFrom) params.append('sign_date_from', selectedSignDateFrom);
      if (selectedSignDateTo) params.append('sign_date_to', selectedSignDateTo);
      if (selectedBetaConfirmDateFrom) params.append('beta_confirm_date_from', selectedBetaConfirmDateFrom);
      if (selectedBetaConfirmDateTo) params.append('beta_confirm_date_to', selectedBetaConfirmDateTo);
      if (selectedFetalBeatDateFrom) params.append('fetal_beat_date_from', selectedFetalBeatDateFrom);
      if (selectedFetalBeatDateTo) params.append('fetal_beat_date_to', selectedFetalBeatDateTo);
      if (selectedDeliveryDateFrom) params.append('delivery_date_from', selectedDeliveryDateFrom);
      if (selectedDeliveryDateTo) params.append('delivery_date_to', selectedDeliveryDateTo);
      if (selectedEmbryoCount) params.append('embryo_count', selectedEmbryoCount);
      if (selectedSurrogateBMI) params.append('surrogate_bmi', selectedSurrogateBMI);
      if (selectedSurrogateBloodType) params.append('surrogate_blood_type', selectedSurrogateBloodType);
      if (selectedSurrogateMaritalStatus) params.append('surrogate_marital_status', selectedSurrogateMaritalStatus);
      if (selectedSurrogateDeliveryHistory) params.append('surrogate_delivery_history', selectedSurrogateDeliveryHistory);
      if (selectedSurrogateMiscarriageHistory) params.append('surrogate_miscarriage_history', selectedSurrogateMiscarriageHistory);
      if (selectedPreviousSurrogacyExperience) params.append('previous_surrogacy_experience', selectedPreviousSurrogacyExperience);
      if (selectedApplicationStatus) params.append('application_status', selectedApplicationStatus);
      if (selectedObgynDoctor) params.append('obgyn_doctor', selectedObgynDoctor);
      if (selectedDeliveryHospital) params.append('delivery_hospital', selectedDeliveryHospital);
      if (selectedClientMaritalStatus) params.append('client_marital_status', selectedClientMaritalStatus);
      if (selectedClientBloodType) params.append('client_blood_type', selectedClientBloodType);
      
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
    setSelectedSignDateFrom('');
    setSelectedSignDateTo('');
    setSelectedBetaConfirmDateFrom('');
    setSelectedBetaConfirmDateTo('');
    setSelectedFetalBeatDateFrom('');
    setSelectedFetalBeatDateTo('');
    setSelectedDeliveryDateFrom('');
    setSelectedDeliveryDateTo('');
    setSelectedEmbryoCount('');
    setSelectedSurrogateBMI('');
    setSelectedSurrogateBloodType('');
    setSelectedSurrogateMaritalStatus('');
    setSelectedSurrogateDeliveryHistory('');
    setSelectedSurrogateMiscarriageHistory('');
    setSelectedPreviousSurrogacyExperience('');
    setSelectedApplicationStatus('');
    setSelectedObgynDoctor('');
    setSelectedDeliveryHospital('');
    setSelectedClientMaritalStatus('');
    setSelectedClientBloodType('');
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
  }, [
    selectedSurrogateAgeRange, selectedEmbryoGrade, selectedSurrogateLocation, selectedSurrogateRace, 
    selectedIvfClinic, selectedEggDonation, selectedSpermDonation, selectedClientLocation,
    selectedSignDateFrom, selectedSignDateTo, selectedBetaConfirmDateFrom, selectedBetaConfirmDateTo,
    selectedFetalBeatDateFrom, selectedFetalBeatDateTo, selectedDeliveryDateFrom, selectedDeliveryDateTo,
    selectedEmbryoCount, selectedSurrogateBMI, selectedSurrogateBloodType, selectedSurrogateMaritalStatus,
    selectedSurrogateDeliveryHistory, selectedSurrogateMiscarriageHistory, selectedPreviousSurrogacyExperience, selectedApplicationStatus,
    selectedObgynDoctor, selectedDeliveryHospital, selectedClientMaritalStatus, selectedClientBloodType
  ]);

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            <button
              onClick={() => {
                clearFilters();
                setTimeout(loadStatistics, 100);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear All Filters
            </button>
          </div>

          {/* Basic Filters */}
          <div className="mb-4">
            <button
              onClick={() => setShowBasicFilters(!showBasicFilters)}
              className="w-full flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <span className="font-medium">Basic Filters</span>
              <span>{showBasicFilters ? '−' : '+'}</span>
            </button>
            {showBasicFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded">
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
            )}
          </div>

          {/* Date Range Filters */}
          <div className="mb-4">
            <button
              onClick={() => setShowDateFilters(!showDateFilters)}
              className="w-full flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <span className="font-medium">Date Range Filters</span>
              <span>{showDateFilters ? '−' : '+'}</span>
            </button>
            {showDateFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded">
                {/* Sign Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sign Date From</label>
                  <input
                    type="date"
                    value={selectedSignDateFrom}
                    onChange={(e) => setSelectedSignDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sign Date To</label>
                  <input
                    type="date"
                    value={selectedSignDateTo}
                    onChange={(e) => setSelectedSignDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Beta Confirm Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beta Confirm Date From</label>
                  <input
                    type="date"
                    value={selectedBetaConfirmDateFrom}
                    onChange={(e) => setSelectedBetaConfirmDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beta Confirm Date To</label>
                  <input
                    type="date"
                    value={selectedBetaConfirmDateTo}
                    onChange={(e) => setSelectedBetaConfirmDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Fetal Beat Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fetal Beat Date From</label>
                  <input
                    type="date"
                    value={selectedFetalBeatDateFrom}
                    onChange={(e) => setSelectedFetalBeatDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fetal Beat Date To</label>
                  <input
                    type="date"
                    value={selectedFetalBeatDateTo}
                    onChange={(e) => setSelectedFetalBeatDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Delivery Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date From</label>
                  <input
                    type="date"
                    value={selectedDeliveryDateFrom}
                    onChange={(e) => setSelectedDeliveryDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date To</label>
                  <input
                    type="date"
                    value={selectedDeliveryDateTo}
                    onChange={(e) => setSelectedDeliveryDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Surrogate Details Filters */}
          <div className="mb-4">
            <button
              onClick={() => setShowSurrogateFilters(!showSurrogateFilters)}
              className="w-full flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <span className="font-medium">Surrogate Details Filters</span>
              <span>{showSurrogateFilters ? '−' : '+'}</span>
            </button>
            {showSurrogateFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded">
                {/* Surrogate BMI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surrogate BMI</label>
                  <select
                    value={selectedSurrogateBMI}
                    onChange={(e) => setSelectedSurrogateBMI(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filters?.available.bmiRanges.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>
                {/* Surrogate Blood Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surrogate Blood Type</label>
                  <select
                    value={selectedSurrogateBloodType}
                    onChange={(e) => setSelectedSurrogateBloodType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filters?.available.surrogateBloodTypes.map(bloodType => (
                      <option key={bloodType} value={bloodType}>{bloodType}</option>
                    ))}
                  </select>
                </div>
                {/* Surrogate Marital Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surrogate Marital Status</label>
                  <select
                    value={selectedSurrogateMaritalStatus}
                    onChange={(e) => setSelectedSurrogateMaritalStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filters?.available.surrogateMaritalStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                {/* Surrogate Delivery History */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surrogate Delivery History</label>
                  <select
                    value={selectedSurrogateDeliveryHistory}
                    onChange={(e) => setSelectedSurrogateDeliveryHistory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filters?.available.deliveryHistoryOptions.map(option => (
                      <option key={option} value={option}>{option === '0' ? 'None' : option === '1' ? '1 delivery' : '2+ deliveries'}</option>
                    ))}
                  </select>
                </div>
                {/* Surrogate Miscarriage History */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surrogate Miscarriage History</label>
                  <select
                    value={selectedSurrogateMiscarriageHistory}
                    onChange={(e) => setSelectedSurrogateMiscarriageHistory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {/* Previous Surrogacy Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previous Surrogacy Experience</label>
                  <select
                    value={selectedPreviousSurrogacyExperience}
                    onChange={(e) => setSelectedPreviousSurrogacyExperience(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {/* Application Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Application Status</label>
                  <select
                    value={selectedApplicationStatus}
                    onChange={(e) => setSelectedApplicationStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filters?.available.applicationStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                {/* Embryo Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Embryo Count</label>
                  <select
                    value={selectedEmbryoCount}
                    onChange={(e) => setSelectedEmbryoCount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </select>
                </div>
                {/* OB/GYN Doctor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OB/GYN Doctor</label>
                  <select
                    value={selectedObgynDoctor}
                    onChange={(e) => setSelectedObgynDoctor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filters?.available.obgynDoctors.map(doctor => (
                      <option key={doctor} value={doctor}>{doctor}</option>
                    ))}
                  </select>
                </div>
                {/* Delivery Hospital */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Hospital</label>
                  <select
                    value={selectedDeliveryHospital}
                    onChange={(e) => setSelectedDeliveryHospital(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filters?.available.deliveryHospitals.map(hospital => (
                      <option key={hospital} value={hospital}>{hospital}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Client Details Filters */}
          <div className="mb-4">
            <button
              onClick={() => setShowClientFilters(!showClientFilters)}
              className="w-full flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <span className="font-medium">Client Details Filters</span>
              <span>{showClientFilters ? '−' : '+'}</span>
            </button>
            {showClientFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded">
                {/* Client Marital Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Marital Status</label>
                  <select
                    value={selectedClientMaritalStatus}
                    onChange={(e) => setSelectedClientMaritalStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                    <option value="separated">Separated</option>
                    <option value="lifePartner">Life Partner</option>
                    <option value="engaged">Engaged</option>
                  </select>
                </div>
                {/* Client Blood Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Blood Type</label>
                  <input
                    type="text"
                    value={selectedClientBloodType}
                    onChange={(e) => setSelectedClientBloodType(e.target.value)}
                    placeholder="e.g., A+, B-, O+"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

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

