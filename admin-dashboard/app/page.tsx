
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ApproveButton from '../components/ApproveButton';
import DashboardStats from '../components/DashboardStats';
import { generateApplicationPDF } from '../lib/generateApplicationPDF';

export default function Home() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 解析申请数据的辅助函数
  const parseApplicationData = (app: any) => {
    let formData: any = {};
    try {
      if (app.form_data) {
        formData = JSON.parse(app.form_data);
      }
    } catch (e) {
      console.error('Error parsing form_data:', e);
    }
    
    return {
      ...app,
      ...formData,
      // 确保基本字段存在
      full_name: app.full_name || formData.fullName || 'Unknown',
      phone: app.phone || formData.phoneNumber || 'N/A',
      email: formData.email || 'N/A',
      age: formData.age || 'N/A',
      dateOfBirth: formData.dateOfBirth || 'N/A',
      // Use address for full address
      address: formData.address || formData.location || 'N/A',
    };
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // 解析所有申请数据
      const parsedApplications = (data || []).map(parseApplicationData);
      setApplications(parsedApplications);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // 过滤和搜索逻辑
  const filteredApplications = applications.filter(app => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      app.full_name?.toLowerCase().includes(searchLower) ||
      app.email?.toLowerCase().includes(searchLower) ||
      app.phone?.includes(searchTerm) ||
      app.address?.toLowerCase().includes(searchLower) ||
      app.age?.toString().includes(searchTerm) ||
      app.employmentStatus?.toLowerCase().includes(searchLower) ||
      app.previousPregnancies?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && (!app.status || app.status === 'pending')) ||
      app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredApplications.map(app => app.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(appId => appId !== id));
    }
  };

  const handleBulkAction = async (action: 'approved' | 'rejected' | 'pending') => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} applications?`)) {
      return;
    }

    try {
      setLoading(true);
      for (const id of selectedIds) {
        await supabase
          .from('applications')
          .update({ 
            status: action,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      }
      
      setSelectedIds([]);
      loadApplications();
    } catch (error) {
      console.error('Error in bulk action:', error);
      alert('Error performing bulk action');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Loading applications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-500">
        Error loading applications: {error}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage surrogate applications and events</p>
        </div>
        
        <DashboardStats />
        
        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                        placeholder="Search by name, email, phone, address, age, or employment status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                {selectedIds.length} application(s) selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('approved')}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium"
                >
                  ✅ Approve All
                </button>
                <button
                  onClick={() => handleBulkAction('rejected')}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium"
                >
                  ❌ Reject All
                </button>
                <button
                  onClick={() => handleBulkAction('pending')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium"
                >
                  ⏳ Mark Pending
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Applications</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadApplications}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🔄 Refresh
            </button>
            <div className="text-sm text-gray-500">
              Showing: {filteredApplications.length} of {applications.length} total
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredApplications.length && filteredApplications.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications?.map((app: any) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(app.id)}
                        onChange={(e) => handleSelectOne(app.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{app.full_name}</div>
                        <div className="text-sm text-gray-500">
                          {app.age ? `Age: ${app.age}` : 'Age not provided'} 
                          {app.previousSurrogacy && ' • Previous Surrogate'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{app.phone}</div>
                        <div className="text-sm text-gray-500">{app.email}</div>
                        {app.address && app.address !== 'N/A' && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                            📍 {app.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full 
                        ${app.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {app.status ? app.status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                        >
                          📋 View
                        </button>
                        <button
                          onClick={() => generateApplicationPDF(app)}
                          className="text-green-600 hover:text-green-900 text-xs font-medium"
                        >
                          📄 PDF
                        </button>
                        <ApproveButton 
                          id={app.id} 
                          currentStatus={app.status} 
                          onUpdate={loadApplications}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredApplications.length === 0 && applications.length > 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No applications match your search criteria.
                    </td>
                  </tr>
                )}
                {applications.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b">
                <h2 className="text-2xl font-bold text-gray-900">
                  Application Details - {selectedApp.full_name}
                </h2>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Step 1: Personal Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">👤 Step 1: Personal Information</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-sm text-gray-900">{selectedApp.full_name || selectedApp.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">First Name</label>
                      <p className="text-sm text-gray-900">{selectedApp.firstName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Last Name</label>
                      <p className="text-sm text-gray-900">{selectedApp.lastName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                      <p className="text-sm text-gray-900">{selectedApp.dateOfBirth || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Age</label>
                      <p className="text-sm text-gray-900">{selectedApp.age || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Blood Type</label>
                      <p className="text-sm text-gray-900">{selectedApp.bloodType || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Height</label>
                      <p className="text-sm text-gray-900">{selectedApp.height || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Weight</label>
                      <p className="text-sm text-gray-900">{selectedApp.weight || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Race/Ethnicity</label>
                      <p className="text-sm text-gray-900">{selectedApp.race || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Religious Background</label>
                      <p className="text-sm text-gray-900">{selectedApp.religiousBackground || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">US Citizen</label>
                      <p className="text-sm text-gray-900">{selectedApp.usCitizen === true ? 'Yes' : selectedApp.usCitizen === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-sm text-gray-900">{selectedApp.phone || selectedApp.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm text-gray-900">{selectedApp.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">How Did You Hear About Us</label>
                      <p className="text-sm text-gray-900">{selectedApp.hearAboutUs || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Previous Surrogacy</label>
                      <p className="text-sm text-gray-900">{selectedApp.previousSurrogacy === true ? `Yes (${selectedApp.previousSurrogacyCount || '?'} times)` : selectedApp.previousSurrogacy === false ? 'No' : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500">Full Address</label>
                    <p className="text-sm text-gray-900">{selectedApp.address || 'N/A'}</p>
                  </div>
                  {selectedApp.citizenshipStatus && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500">Citizenship Status</label>
                      <p className="text-sm text-gray-900">{selectedApp.citizenshipStatus}</p>
                    </div>
                  )}
                </div>

                {/* Step 2: Pregnancy & Delivery History */}
                <div className="bg-pink-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-900 mb-4">🤰 Step 2: Pregnancy & Delivery History</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Total Deliveries (20+ weeks)</label>
                      <p className="text-sm text-gray-900">{selectedApp.totalDeliveries || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Previous Surrogacy</label>
                      <p className="text-sm text-gray-900">{selectedApp.previousSurrogacy === true ? `Yes (${selectedApp.previousSurrogacyCount || '?'} times)` : 'No'}</p>
                    </div>
                  </div>
                  {selectedApp.deliveries && selectedApp.deliveries.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500 mb-2">Delivery History</label>
                      <div className="space-y-3">
                        {selectedApp.deliveries.map((delivery: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <p className="text-sm font-medium text-gray-700">Delivery #{index + 1}</p>
                            <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                              <div><span className="text-gray-500">Year:</span> {delivery.year || 'N/A'}</div>
                              <div><span className="text-gray-500">Gender:</span> {delivery.gender || 'N/A'}</div>
                              <div><span className="text-gray-500">Weight:</span> {delivery.birthWeight || 'N/A'}</div>
                              <div><span className="text-gray-500">Method:</span> {delivery.deliveryMethod || 'N/A'}</div>
                              <div><span className="text-gray-500">Weeks:</span> {delivery.gestationWeeks || 'N/A'}</div>
                              <div><span className="text-gray-500">Conception:</span> {delivery.conceptionMethod || 'N/A'}</div>
                              <div><span className="text-gray-500">Result:</span> {delivery.pregnancyResult || 'N/A'}</div>
                              <div><span className="text-gray-500">Complications:</span> {delivery.complications || 'None'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Health Information */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-900 mb-4">🏥 Step 3: Health Information</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Health Insurance</label>
                      <p className="text-sm text-gray-900">{selectedApp.healthInsurance === true ? 'Yes' : selectedApp.healthInsurance === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Maternity Coverage</label>
                      <p className="text-sm text-gray-900">{selectedApp.maternityCoverage === true ? 'Yes' : selectedApp.maternityCoverage === 'not_sure' ? 'Not Sure' : selectedApp.maternityCoverage === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Delivery Hospital</label>
                      <p className="text-sm text-gray-900">{selectedApp.deliveryHospital || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Monthly Cycles</label>
                      <p className="text-sm text-gray-900">{selectedApp.monthlyCycles === true ? 'Yes' : selectedApp.monthlyCycles === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Cycle Days</label>
                      <p className="text-sm text-gray-900">{selectedApp.cycleDays || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Period Days</label>
                      <p className="text-sm text-gray-900">{selectedApp.periodDays || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Smoking</label>
                      <p className="text-sm text-gray-900">{selectedApp.smokingStatus || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Alcohol</label>
                      <p className="text-sm text-gray-900">{selectedApp.alcoholUsage || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Illegal Drugs</label>
                      <p className="text-sm text-gray-900">{selectedApp.illegalDrugs === true ? 'Yes' : selectedApp.illegalDrugs === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Mental Health Treatment</label>
                      <p className="text-sm text-gray-900">{selectedApp.mentalHealthTreatment === true ? 'Yes' : selectedApp.mentalHealthTreatment === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Postpartum Depression</label>
                      <p className="text-sm text-gray-900">{selectedApp.postpartumDepression === true ? 'Yes' : selectedApp.postpartumDepression === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Hepatitis B Vaccinated</label>
                      <p className="text-sm text-gray-900">{selectedApp.hepatitisBVaccinated === true ? 'Yes' : selectedApp.hepatitisBVaccinated === false ? 'No' : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Children List</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.childrenList || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Medications</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.currentMedications || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Surgeries</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.surgeries === true ? selectedApp.surgeryDetails || 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Allergies</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.allergies === true ? selectedApp.allergiesDetails || 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Step 4: Sexual History */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-purple-900 mb-4">💕 Step 4: Sexual History</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Birth Control</label>
                      <p className="text-sm text-gray-900">{selectedApp.currentBirthControl === true ? `Yes (${selectedApp.birthControlMethod || 'N/A'})` : selectedApp.currentBirthControl === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Sexual Partner</label>
                      <p className="text-sm text-gray-900">{selectedApp.sexualPartner === true ? 'Yes' : selectedApp.sexualPartner === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Partners (Last 3 Years)</label>
                      <p className="text-sm text-gray-900">{selectedApp.partnersLastThreeYears || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">High Risk HIV Contact</label>
                      <p className="text-sm text-gray-900">{selectedApp.highRiskHIVContact === true ? 'Yes' : selectedApp.highRiskHIVContact === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">HIV Risk</label>
                      <p className="text-sm text-gray-900">{selectedApp.hivRisk === true ? 'Yes' : selectedApp.hivRisk === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">STD History</label>
                      <p className="text-sm text-gray-900">{selectedApp.stdHistory === true ? `Yes - ${selectedApp.stdDetails || 'N/A'}` : selectedApp.stdHistory === false ? 'No' : 'N/A'}</p>
                    </div>
                  </div>
                  {selectedApp.pastContraceptives && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500">Past Contraceptives</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.pastContraceptives}</p>
                    </div>
                  )}
                </div>

                {/* Step 5: Employment Information */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-yellow-900 mb-4">💼 Step 5: Employment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Employment</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.currentEmployment || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Monthly Income</label>
                      <p className="text-sm text-gray-900">{selectedApp.monthlyIncome ? `$${selectedApp.monthlyIncome}` : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Spouse Employment</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.spouseEmployment || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Spouse Monthly Income</label>
                      <p className="text-sm text-gray-900">{selectedApp.spouseMonthlyIncome ? `$${selectedApp.spouseMonthlyIncome}` : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Persons Supported</label>
                      <p className="text-sm text-gray-900">{selectedApp.personsSupported || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Public Assistance</label>
                      <p className="text-sm text-gray-900">{selectedApp.publicAssistance === true ? 'Yes' : selectedApp.publicAssistance === false ? 'No' : 'N/A'}</p>
                    </div>
                  </div>
                  {selectedApp.householdMembers && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500">Household Members</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.householdMembers}</p>
                    </div>
                  )}
                </div>

                {/* Step 6: Education */}
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-indigo-900 mb-4">🎓 Step 6: Education</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Education Level</label>
                      <p className="text-sm text-gray-900">{selectedApp.educationLevel === 'highSchool' ? 'High School' : selectedApp.educationLevel === 'college' ? 'College' : selectedApp.educationLevel === 'tradeSchool' ? 'Trade School' : selectedApp.educationLevel || 'N/A'}</p>
                    </div>
                    {selectedApp.tradeSchoolDetails && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Trade School Details</label>
                        <p className="text-sm text-gray-900">{selectedApp.tradeSchoolDetails}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Referral Code</label>
                      <p className="text-sm text-gray-900">{selectedApp.referralCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Step 7: General Questions & Preferences */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-orange-900 mb-4">💭 Step 7: General Questions & Preferences</h3>
                  <div className="space-y-4">
                    {selectedApp.surrogacyUnderstanding && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Surrogacy Understanding & Motivation</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.surrogacyUnderstanding}</p>
                      </div>
                    )}
                    {selectedApp.selfIntroduction && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Self Introduction</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.selfIntroduction}</p>
                      </div>
                    )}
                    {selectedApp.expectedSupport && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Expected Support</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.expectedSupport}</p>
                      </div>
                    )}
                    {selectedApp.partnerFeelings && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Partner Feelings About Surrogacy</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.partnerFeelings}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Same Sex Couple</p>
                      <p className="text-sm font-medium">{selectedApp.sameSexCouple === true ? '✓ Yes' : selectedApp.sameSexCouple === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Single Male</p>
                      <p className="text-sm font-medium">{selectedApp.singleMale === true ? '✓ Yes' : selectedApp.singleMale === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Single Female</p>
                      <p className="text-sm font-medium">{selectedApp.singleFemale === true ? '✓ Yes' : selectedApp.singleFemale === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">International</p>
                      <p className="text-sm font-medium">{selectedApp.internationalCouple === true ? '✓ Yes' : selectedApp.internationalCouple === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Carry Twins</p>
                      <p className="text-sm font-medium">{selectedApp.carryTwins === true ? '✓ Yes' : selectedApp.carryTwins === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Attend Checkups</p>
                      <p className="text-sm font-medium">{selectedApp.attendCheckups === true ? '✓ Yes' : selectedApp.attendCheckups === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Parents in Delivery</p>
                      <p className="text-sm font-medium">{selectedApp.parentsInDeliveryRoom === true ? '✓ Yes' : selectedApp.parentsInDeliveryRoom === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Avoid Long Travel</p>
                      <p className="text-sm font-medium">{selectedApp.avoidLongTravel === true ? '✓ Yes' : selectedApp.avoidLongTravel === false ? '✗ No' : '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Step 8: Authorization */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-900 mb-4">✍️ Step 8: Authorization</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Authorization Agreed</label>
                      <p className="text-sm text-gray-900">{selectedApp.authorizationAgreed === true ? '✓ Agreed' : 'Not Agreed'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Emergency Contact</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.emergencyContact || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Application Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">📋 Application Status</h3>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full 
                      ${selectedApp.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        selectedApp.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {selectedApp.status ? selectedApp.status.toUpperCase() : 'PENDING'}
                    </span>
                    <span className="text-sm text-gray-500">
                      Applied: {new Date(selectedApp.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white py-4">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => generateApplicationPDF(selectedApp)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                  <ApproveButton 
                    id={selectedApp.id} 
                    currentStatus={selectedApp.status} 
                    onUpdate={() => {
                      loadApplications();
                      setSelectedApp(null);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

