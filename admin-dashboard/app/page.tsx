
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ApproveButton from '../components/ApproveButton';
import DashboardStats from '../components/DashboardStats';

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
    let formData = {};
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
      address: formData.address || 'N/A',
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
                        {app.address && (
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
                          📋 View Details
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Application Details
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
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">👤 Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-sm text-gray-900">{selectedApp.full_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Age</label>
                      <p className="text-sm text-gray-900">{selectedApp.age || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-sm text-gray-900">{selectedApp.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm text-gray-900">{selectedApp.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                      <p className="text-sm text-gray-900">{selectedApp.dateOfBirth || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">How did you hear about us?</label>
                      <p className="text-sm text-gray-900">{selectedApp.hearAboutUs || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <p className="text-sm text-gray-900">{selectedApp.address || 'Not provided'}</p>
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">🏥 Medical Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Previous Pregnancies</label>
                      <p className="text-sm text-gray-900">{selectedApp.previousPregnancies || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Previous Surrogacy Experience</label>
                      <p className="text-sm text-gray-900">
                        {selectedApp.previousSurrogacy ? 'Yes' : selectedApp.previousSurrogacy === false ? 'No' : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Pregnancy Complications</label>
                      <p className="text-sm text-gray-900">{selectedApp.pregnancyComplications || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Medications</label>
                      <p className="text-sm text-gray-900">{selectedApp.currentMedications || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Health Conditions</label>
                      <p className="text-sm text-gray-900">{selectedApp.healthConditions || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">BMI</label>
                      <p className="text-sm text-gray-900">{selectedApp.bmi || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Lifestyle Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">🏃 Lifestyle Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Smoking Status</label>
                      <p className="text-sm text-gray-900">{selectedApp.smokingStatus || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Alcohol Usage</label>
                      <p className="text-sm text-gray-900">{selectedApp.alcoholUsage || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Exercise Routine</label>
                      <p className="text-sm text-gray-900">{selectedApp.exerciseRoutine || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Employment Status</label>
                      <p className="text-sm text-gray-900">{selectedApp.employmentStatus || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500">Support System</label>
                    <p className="text-sm text-gray-900">{selectedApp.supportSystem || 'Not specified'}</p>
                  </div>
                </div>

                {/* Legal & Background */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">⚖️ Legal & Background</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Criminal Background</label>
                      <p className="text-sm text-gray-900">
                        {selectedApp.criminalBackground ? 'Yes' : selectedApp.criminalBackground === false ? 'No' : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Insurance Coverage</label>
                      <p className="text-sm text-gray-900">{selectedApp.insuranceCoverage || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Financial Stability</label>
                      <p className="text-sm text-gray-900">{selectedApp.financialStability || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Travel Willingness</label>
                      <p className="text-sm text-gray-900">
                        {selectedApp.travelWillingness ? 'Yes' : selectedApp.travelWillingness === false ? 'No' : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedApp.legalIssues && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500">Legal Issues</label>
                      <p className="text-sm text-gray-900">{selectedApp.legalIssues}</p>
                    </div>
                  )}
                </div>

                {/* Preferences & Additional */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">💭 Preferences & Additional Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Compensation Expectations</label>
                      <p className="text-sm text-gray-900">{selectedApp.compensationExpectations || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Timeline Availability</label>
                      <p className="text-sm text-gray-900">{selectedApp.timelineAvailability || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Special Preferences</label>
                      <p className="text-sm text-gray-900">{selectedApp.specialPreferences || 'Not specified'}</p>
                    </div>
                    {selectedApp.additionalComments && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Additional Comments</label>
                        <p className="text-sm text-gray-900">{selectedApp.additionalComments}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Application Status */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Status</h3>
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
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
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
