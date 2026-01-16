
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ApproveButton from '../components/ApproveButton';
import DashboardStats from '../components/DashboardStats';
import { generateApplicationPDF } from '../lib/generateApplicationPDF';

// Intended Parent Approve/Reject Button Component
function IntendedParentApproveButton({ id, currentStatus, onUpdate }: { id: number; currentStatus?: string; onUpdate?: () => void }) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus: 'approved' | 'rejected' | 'pending') => {
    setLoading(true);
    try {
      const response = await fetch('/api/intended-parent-applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      if (onUpdate) {
        onUpdate();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error updating intended parent application:', error);
      alert(`Error updating application status: ${error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (confirm('Are you sure you want to approve this application?')) {
      updateStatus('approved');
    }
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this application?')) {
      updateStatus('rejected');
    }
  };

  const handlePending = () => {
    if (confirm('Set this application back to pending status?')) {
      updateStatus('pending');
    }
  };

  if (currentStatus === 'approved') {
    return (
      <div className="flex space-x-2">
        <span className="text-green-600 text-xs font-medium">✅ Approved</span>
        <button
          onClick={handleReject}
          disabled={loading}
          className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
        >
          {loading ? '...' : 'Reject'}
        </button>
      </div>
    );
  }

  if (currentStatus === 'rejected') {
    return (
      <div className="flex space-x-2">
        <span className="text-red-600 text-xs font-medium">❌ Rejected</span>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50"
        >
          {loading ? '...' : 'Approve'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-xs disabled:opacity-50"
      >
        {loading ? '...' : 'Approve'}
      </button>
      <button
        onClick={handleReject}
        disabled={loading}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs disabled:opacity-50"
      >
        {loading ? '...' : 'Reject'}
      </button>
    </div>
  );
}

export default function Home() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'surrogate', 'intended_parent'
  const [selectedIds, setSelectedIds] = useState<Array<{id: string | number, type: string}>>([]);

  // 解析 Surrogate 申请数据的辅助函数
  const parseSurrogateApplicationData = (app: any) => {
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
      applicationType: 'surrogate',
      // 确保基本字段存在
      full_name: app.full_name || formData.fullName || 'Unknown',
      phone: app.phone || formData.phoneNumber || 'N/A',
      email: formData.email || 'N/A',
      age: formData.age || 'N/A',
      dateOfBirth: formData.dateOfBirth || 'N/A',
      // Use location for display (city/state), address for full address
      location: formData.location || app.location || 'N/A',
      address: formData.address || 'N/A',
      // Photos array (for multiple lifestyle photos)
      photos: formData.photos || (formData.photoUrl ? [formData.photoUrl] : []),
      // Backward compatibility: keep photoUrl if photos array is empty
      photoUrl: formData.photoUrl || (formData.photos && formData.photos.length > 0 ? formData.photos[0] : null),
    };
  };

  // 解析 Intended Parent 申请数据的辅助函数
  const parseIntendedParentApplicationData = (app: any) => {
    let formData: any = {};
    try {
      if (app.form_data) {
        formData = typeof app.form_data === 'string' ? JSON.parse(app.form_data) : app.form_data;
      }
    } catch (e) {
      console.error('Error parsing intended parent form_data:', e);
    }
    
    const parent1Name = formData.parent1FirstName && formData.parent1LastName 
      ? `${formData.parent1FirstName} ${formData.parent1LastName}`
      : formData.parent1FirstName || formData.parent1LastName || 'Unknown';
    
    // Format phone number: +{countryCode} ({areaCode}) {phoneNumber}
    const formatPhone = () => {
      if (formData.parent1PhoneCountryCode && formData.parent1PhoneAreaCode && formData.parent1PhoneNumber) {
        return `+${formData.parent1PhoneCountryCode} (${formData.parent1PhoneAreaCode}) ${formData.parent1PhoneNumber}`;
      } else if (formData.parent1PhoneNumber) {
        return formData.parent1PhoneNumber;
      } else if (formData.parent1PhoneCountryCode) {
        return `+${formData.parent1PhoneCountryCode}`;
      }
      return 'N/A';
    };
    
    return {
      ...app,
      ...formData,
      applicationType: 'intended_parent',
      full_name: parent1Name,
      phone: formatPhone(),
      email: formData.parent1Email || 'N/A',
      location: formData.parent1CountryState || 'N/A',
      address: formData.parent1AddressStreet || 'N/A',
      submitted_at: app.submitted_at || app.created_at,
    };
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // 同时加载 Surrogate 和 Intended Parent 申请
      const [surrogateRes, intendedParentRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*')
          .order('created_at', { ascending: false }),
        fetch('/api/intended-parent-applications').then(res => res.json())
      ]);

      if (surrogateRes.error) throw surrogateRes.error;
      
      // 解析 Surrogate 申请
      const parsedSurrogateApps = (surrogateRes.data || []).map(parseSurrogateApplicationData);
      
      // 解析 Intended Parent 申请
      const parsedIntendedParentApps = (intendedParentRes.data || []).map(parseIntendedParentApplicationData);
      
      // 合并并排序（按提交日期，最新的在前）
      const allApplications = [...parsedSurrogateApps, ...parsedIntendedParentApps].sort((a, b) => {
        const dateA = new Date(a.submitted_at || a.created_at || 0).getTime();
        const dateB = new Date(b.submitted_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setApplications(allApplications);
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
      app.location?.toLowerCase().includes(searchLower) ||
      app.age?.toString().includes(searchTerm) ||
      app.employmentStatus?.toLowerCase().includes(searchLower) ||
      app.previousPregnancies?.toLowerCase().includes(searchLower) ||
      (app.applicationType === 'intended_parent' && (
        app.parent1FirstName?.toLowerCase().includes(searchLower) ||
        app.parent1LastName?.toLowerCase().includes(searchLower) ||
        app.parent2FirstName?.toLowerCase().includes(searchLower) ||
        app.parent2LastName?.toLowerCase().includes(searchLower)
      ));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && (!app.status || app.status === 'pending')) ||
      app.status === statusFilter;
    
    const matchesType = typeFilter === 'all' || app.applicationType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredApplications.map(app => ({ id: app.id, type: app.applicationType })));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string | number, type: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, { id, type }]);
    } else {
      setSelectedIds(prev => prev.filter(item => !(item.id === id && item.type === type)));
    }
  };

  const handleBulkAction = async (action: 'approved' | 'rejected' | 'pending') => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} applications?`)) {
      return;
    }

    try {
      setLoading(true);
      for (const item of selectedIds) {
        if (item.type === 'surrogate') {
          await supabase
            .from('applications')
            .update({ 
              status: action,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
        } else if (item.type === 'intended_parent') {
          await fetch('/api/intended-parent-applications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, status: action })
          });
        }
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

  const handleDeleteApplication = async (id: string | number, name: string, type: string) => {
    if (!confirm(`Are you sure you want to delete the application from "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      if (type === 'surrogate') {
        const { error } = await supabase
          .from('applications')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } else if (type === 'intended_parent') {
        const res = await fetch(`/api/intended-parent-applications?id=${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete intended parent application');
      }
      
      loadApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Error deleting application');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to DELETE ${selectedIds.length} applications? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      for (const item of selectedIds) {
        if (item.type === 'surrogate') {
          await supabase
            .from('applications')
            .delete()
            .eq('id', item.id);
        } else if (item.type === 'intended_parent') {
          await fetch(`/api/intended-parent-applications?id=${item.id}`, {
            method: 'DELETE'
          });
        }
      }
      
      setSelectedIds([]);
      loadApplications();
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Error deleting applications');
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
          <p className="text-gray-600">Manage surrogate and intended parent applications</p>
        </div>
        
        <DashboardStats />
        
        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, phone, location, age, or employment status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
              >
                <option value="all">All Types</option>
                <option value="surrogate">Surrogate</option>
                <option value="intended_parent">Intended Parent</option>
              </select>
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
                <button
                  onClick={handleBulkDelete}
                  className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium"
                >
                  🗑️ Delete Selected
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications?.map((app: any) => (
                  <tr key={`${app.applicationType}-${app.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input
                        type="checkbox"
                        checked={selectedIds.some(item => item.id === app.id && item.type === app.applicationType)}
                        onChange={(e) => handleSelectOne(app.id, app.applicationType, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                        app.applicationType === 'intended_parent' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {app.applicationType === 'intended_parent' ? 'Intended Parent' : 'Surrogate'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.submitted_at || app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{app.full_name}</div>
                        {app.applicationType === 'surrogate' ? (
                          <div className="text-sm text-gray-500">
                            {app.age ? `Age: ${app.age}` : 'Age not provided'} 
                            {app.previousSurrogacy && ' • Previous Surrogate'}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {app.parent2FirstName && app.parent2LastName 
                              ? `Couple: ${app.parent1FirstName} ${app.parent1LastName} & ${app.parent2FirstName} ${app.parent2LastName}`
                              : `Single: ${app.parent1FirstName} ${app.parent1LastName}`
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{app.phone}</div>
                        <div className="text-sm text-gray-500">{app.email}</div>
                        {app.location && app.location !== 'N/A' && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                            📍 {app.location}
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
                          onClick={async () => {
                            try {
                              await generateApplicationPDF(app);
                            } catch (error) {
                              console.error('Error generating PDF:', error);
                              alert('Error generating PDF. Please try again.');
                            }
                          }}
                          className="text-green-600 hover:text-green-900 text-xs font-medium"
                        >
                          📄 PDF
                        </button>
                        {app.applicationType === 'surrogate' ? (
                          <ApproveButton 
                            id={app.id} 
                            currentStatus={app.status} 
                            onUpdate={loadApplications}
                          />
                        ) : (
                          <IntendedParentApproveButton 
                            id={app.id} 
                            currentStatus={app.status} 
                            onUpdate={loadApplications}
                          />
                        )}
                        <button
                          onClick={() => handleDeleteApplication(app.id, app.full_name, app.applicationType)}
                          className="text-gray-500 hover:text-red-600 text-xs font-medium"
                        >
                          🗑️
                        </button>
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
                {selectedApp.applicationType === 'intended_parent' ? (
                  <>
                    {/* Intended Parent Application Template */}
                    {/* Step 1: Family Structure & Basic Information */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-blue-900 mb-4">👨‍👩‍👧 Step 1: Family Structure & Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Family Structure</label>
                          <p className="text-sm text-gray-900">{selectedApp.familyStructure || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">How Did You Hear About Us</label>
                          <p className="text-sm text-gray-900">{selectedApp.hearAboutUs || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Intended Parent 1 */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-green-900 mb-4">👤 Intended Parent 1</h3>
                      
                      {/* Intended Parent Photo */}
                      {selectedApp.photoUrl && (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-500 mb-2">Intended Parent Photo</label>
                          <div className="relative">
                            <img
                              src={selectedApp.photoUrl}
                              alt="Intended Parent Photo"
                              className="w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <a
                              href={selectedApp.photoUrl}
                              download
                              className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">First Name</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1FirstName || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Last Name</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1LastName || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                          <p className="text-sm text-gray-900">
                            {selectedApp.parent1DateOfBirthMonth && selectedApp.parent1DateOfBirthDay && selectedApp.parent1DateOfBirthYear
                              ? `${selectedApp.parent1DateOfBirthMonth}/${selectedApp.parent1DateOfBirthDay}/${selectedApp.parent1DateOfBirthYear}`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Gender</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1Gender || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Blood Type</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1BloodType || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Citizenship</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1Citizenship || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Country/State of Residence</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1CountryState || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Occupation</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1Occupation || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Languages</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1Languages || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-sm text-gray-900">
                            {selectedApp.parent1PhoneCountryCode && selectedApp.parent1PhoneAreaCode && selectedApp.parent1PhoneNumber
                              ? `+${selectedApp.parent1PhoneCountryCode} (${selectedApp.parent1PhoneAreaCode}) ${selectedApp.parent1PhoneNumber}`
                              : selectedApp.parent1PhoneNumber || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Email</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1Email || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Emergency Contact</label>
                          <p className="text-sm text-gray-900">{selectedApp.parent1EmergencyContact || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-500">Address</label>
                        <p className="text-sm text-gray-900">
                          {selectedApp.parent1AddressStreet || 'N/A'}
                          {selectedApp.parent1AddressStreet2 && `, ${selectedApp.parent1AddressStreet2}`}
                          {selectedApp.parent1AddressCity && `, ${selectedApp.parent1AddressCity}`}
                          {selectedApp.parent1AddressState && `, ${selectedApp.parent1AddressState}`}
                          {selectedApp.parent1AddressZip && ` ${selectedApp.parent1AddressZip}`}
                        </p>
                      </div>
                    </div>

                    {/* Intended Parent 2 */}
                    {(selectedApp.parent2FirstName || selectedApp.parent2LastName) && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-purple-900 mb-4">👤 Intended Parent 2</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-500">First Name</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2FirstName || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Last Name</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2LastName || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                            <p className="text-sm text-gray-900">
                              {selectedApp.parent2DateOfBirthMonth && selectedApp.parent2DateOfBirthDay && selectedApp.parent2DateOfBirthYear
                                ? `${selectedApp.parent2DateOfBirthMonth}/${selectedApp.parent2DateOfBirthDay}/${selectedApp.parent2DateOfBirthYear}`
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Gender</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2Gender || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Blood Type</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2BloodType || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Citizenship</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2Citizenship || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Country/State of Residence</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2CountryState || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Occupation</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2Occupation || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Languages</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2Languages || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Phone</label>
                            <p className="text-sm text-gray-900">
                              {selectedApp.parent2PhoneCountryCode && selectedApp.parent2PhoneAreaCode && selectedApp.parent2PhoneNumber
                                ? `+${selectedApp.parent2PhoneCountryCode} (${selectedApp.parent2PhoneAreaCode}) ${selectedApp.parent2PhoneNumber}`
                                : selectedApp.parent2PhoneNumber || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Email</label>
                            <p className="text-sm text-gray-900">{selectedApp.parent2Email || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Family Background */}
                    <div className="bg-pink-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-pink-900 mb-4">👨‍👩‍👧‍👦 Step 3: Family Background</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">How Long Have You Been Together</label>
                          <p className="text-sm text-gray-900">{selectedApp.howLongTogether || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Do You Have Any Children</label>
                          <p className="text-sm text-gray-900">{selectedApp.haveChildren === true ? 'Yes' : selectedApp.haveChildren === false ? 'No' : 'N/A'}</p>
                        </div>
                        {selectedApp.haveChildren && (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-500">Children Details</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.childrenDetails || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step 4: Medical & Fertility History */}
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-yellow-900 mb-4">🏥 Step 4: Medical & Fertility History</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Reason for Pursuing Surrogacy</label>
                          <p className="text-sm text-gray-900">
                            {Array.isArray(selectedApp.reasonForSurrogacy) 
                              ? selectedApp.reasonForSurrogacy.join(', ') 
                              : selectedApp.reasonForSurrogacy || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Have You Undergone IVF</label>
                          <p className="text-sm text-gray-900">{selectedApp.undergoneIVF === true ? 'Yes' : selectedApp.undergoneIVF === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Do You Need Donor Eggs</label>
                          <p className="text-sm text-gray-900">{selectedApp.needDonorEggs === true ? 'Yes' : selectedApp.needDonorEggs === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Do You Need Donor Sperm</label>
                          <p className="text-sm text-gray-900">{selectedApp.needDonorSperm === true ? 'Yes' : selectedApp.needDonorSperm === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Do You Currently Have Embryos</label>
                          <p className="text-sm text-gray-900">{selectedApp.haveEmbryos === true ? 'Yes' : selectedApp.haveEmbryos === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Number of Embryos</label>
                          <p className="text-sm text-gray-900">{selectedApp.numberOfEmbryos || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">PGT-A Tested</label>
                          <p className="text-sm text-gray-900">{selectedApp.pgtATested === true ? 'Yes' : selectedApp.pgtATested === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Embryo Development Day</label>
                          <p className="text-sm text-gray-900">{selectedApp.embryoDevelopmentDay || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Frozen at Which Clinic</label>
                          <p className="text-sm text-gray-900">{selectedApp.frozenAtClinic || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Clinic Email</label>
                          <p className="text-sm text-gray-900">{selectedApp.clinicEmail || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Fertility Doctor Name</label>
                          <p className="text-sm text-gray-900">{selectedApp.fertilityDoctorName || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">HIV/Hepatitis/STD Status</label>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.hivHepatitisStdStatus || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 5: Surrogate Preferences */}
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-indigo-900 mb-4">💝 Step 5: Surrogate Preferences</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Preferred Surrogate Age Range</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferredSurrogateAgeRange || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Surrogate Location Preference</label>
                          <p className="text-sm text-gray-900">{selectedApp.surrogateLocationPreference || 'N/A'}</p>
                        </div>
                        {selectedApp.surrogateLocationPreference === 'specific_states' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Specific States</label>
                            <p className="text-sm text-gray-900">{selectedApp.specificStates || 'N/A'}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Accept Surrogate with Previous C-sections</label>
                          <p className="text-sm text-gray-900">{selectedApp.acceptPreviousCsection === true ? 'Yes' : selectedApp.acceptPreviousCsection === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate Who Does Not Work During Pregnancy</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferNoWorkDuringPregnancy === true ? 'Yes' : selectedApp.preferNoWorkDuringPregnancy === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate with Stable Home Environment</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferStableHome === true ? 'Yes' : selectedApp.preferStableHome === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate with Flexible Schedule</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferFlexibleSchedule === true ? 'Yes' : selectedApp.preferFlexibleSchedule === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Do You Have Diet Preference During Pregnancy</label>
                          <p className="text-sm text-gray-900">{selectedApp.dietPreferenceYes === true ? 'Yes' : selectedApp.dietPreferenceYes === false ? 'No' : 'N/A'}</p>
                        </div>
                        {selectedApp.dietPreferenceYes && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Diet Preference</label>
                            <p className="text-sm text-gray-900">{selectedApp.dietPreference || 'N/A'}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Communication Preferences</label>
                          <p className="text-sm text-gray-900">
                            {Array.isArray(selectedApp.communicationPreference)
                              ? selectedApp.communicationPreference.join(', ')
                              : selectedApp.communicationPreference || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Relationship Style With Surrogate</label>
                          <p className="text-sm text-gray-900">
                            {Array.isArray(selectedApp.relationshipStyle)
                              ? selectedApp.relationshipStyle.join(', ')
                              : selectedApp.relationshipStyle || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate to Follow Specific OB/GYN Guidelines</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferSpecificObGynGuidelines === true ? 'Yes' : selectedApp.preferSpecificObGynGuidelines === false ? 'No' : 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 6: Additional Surrogate Preferences */}
                    <div className="bg-teal-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-teal-900 mb-4">💝 Step 6: Additional Surrogate Preferences</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate to Avoid Heavy Lifting</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferAvoidHeavyLifting === true ? 'Yes' : selectedApp.preferAvoidHeavyLifting === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate to Avoid Travel During Pregnancy</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferAvoidTravel === true ? 'Yes' : selectedApp.preferAvoidTravel === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Comfortable with Surrogate Delivering in Her Local Hospital</label>
                          <p className="text-sm text-gray-900">{selectedApp.comfortableWithLocalHospital === true ? 'Yes' : selectedApp.comfortableWithLocalHospital === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate Who is Open to Selective Reduction</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferOpenToSelectiveReduction === true ? 'Yes' : selectedApp.preferOpenToSelectiveReduction === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate Who is Open to Termination for Medical Reasons</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferOpenToTerminationMedical === true ? 'Yes' : selectedApp.preferOpenToTerminationMedical === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate with Previous Surrogacy Experience</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferPreviousSurrogacyExperience || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate with Strong Support System</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferStrongSupportSystem === true ? 'Yes' : selectedApp.preferStrongSupportSystem === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate Who is Married</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferMarried || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate with Stable Income</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferStableIncome === true ? 'Yes' : selectedApp.preferStableIncome === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate Who is Comfortable with Intended Parents Attending Appointments</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferComfortableWithAppointments || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Prefer Surrogate Who is Comfortable with Intended Parents Being Present at Birth</label>
                          <p className="text-sm text-gray-900">{selectedApp.preferComfortableWithBirth || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 7: General Questions */}
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-orange-900 mb-4">❓ Step 7: General Questions</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Will You Transfer More Than One Embryo</label>
                          <p className="text-sm text-gray-900">{selectedApp.willTransferMoreThanOneEmbryo === true ? 'Yes' : selectedApp.willTransferMoreThanOneEmbryo === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Attorney Name</label>
                          <p className="text-sm text-gray-900">{selectedApp.attorneyName || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Attorney Email</label>
                          <p className="text-sm text-gray-900">{selectedApp.attorneyEmail || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Do You Have a Translator</label>
                          <p className="text-sm text-gray-900">{selectedApp.haveTranslator === true ? 'Yes' : selectedApp.haveTranslator === false ? 'No' : 'N/A'}</p>
                        </div>
                        {selectedApp.haveTranslator && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Translator Name</label>
                              <p className="text-sm text-gray-900">{selectedApp.translatorName || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Translator Email</label>
                              <p className="text-sm text-gray-900">{selectedApp.translatorEmail || 'N/A'}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Are You Prepared for the Possibility of a Failed Embryo Transfer</label>
                          <p className="text-sm text-gray-900">{selectedApp.preparedForFailedTransfer === true ? 'Yes' : selectedApp.preparedForFailedTransfer === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Are You Willing to Attempt Multiple Cycles if Needed</label>
                          <p className="text-sm text-gray-900">{selectedApp.willingToAttemptMultipleCycles === true ? 'Yes' : selectedApp.willingToAttemptMultipleCycles === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Are You Emotionally Prepared for the Full Surrogacy Journey</label>
                          <p className="text-sm text-gray-900">{selectedApp.emotionallyPrepared === true ? 'Yes' : selectedApp.emotionallyPrepared === false ? 'No' : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Are You Able to Handle Potential Delays or Medical Risks</label>
                          <p className="text-sm text-gray-900">{selectedApp.ableToHandleDelaysOrRisks === true ? 'Yes' : selectedApp.ableToHandleDelaysOrRisks === false ? 'No' : 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 8: Letter to Surrogate */}
                    <div className="bg-red-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-red-900 mb-4">💌 Step 8: Letter to Surrogate</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Letter to Surrogate</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.letterToSurrogate || 'N/A'}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Surrogate Application Template */}
                    {/* Step 1: Personal Information */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-blue-900 mb-4">👤 Step 1: Personal Information</h3>
                      
                      {/* Surrogate Lifestyle Photos (6 photos) */}
                      {selectedApp.photos && Array.isArray(selectedApp.photos) && selectedApp.photos.length > 0 && (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-500 mb-2">Lifestyle Photos ({selectedApp.photos.length} photos)</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedApp.photos.map((photoUrl: string, index: number) => (
                              <div key={index} className="relative">
                                <img
                                  src={photoUrl}
                                  alt={`Lifestyle Photo ${index + 1}`}
                                  className="w-full h-auto rounded-lg border border-gray-300 shadow-sm"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <a
                                  href={photoUrl}
                                  download
                                  className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                >
                                  Download
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Backward compatibility: single photoUrl */}
                      {(!selectedApp.photos || !Array.isArray(selectedApp.photos) || selectedApp.photos.length === 0) && selectedApp.photoUrl && (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-500 mb-2">Surrogate Photo</label>
                          <div className="relative">
                            <img
                              src={selectedApp.photoUrl}
                              alt="Surrogate Photo"
                              className="w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <a
                              href={selectedApp.photoUrl}
                              download
                              className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                      
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
                      <label className="block text-sm font-medium text-gray-500">Middle Name</label>
                      <p className="text-sm text-gray-900">{selectedApp.middleName || 'N/A'}</p>
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
                      <label className="block text-sm font-medium text-gray-500">Practicing Religion</label>
                      <p className="text-sm text-gray-900">{selectedApp.practicingReligion === true ? 'Yes' : selectedApp.practicingReligion === false ? 'No' : 'N/A'}</p>
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
                      <label className="block text-sm font-medium text-gray-500">Referral Code</label>
                      <p className="text-sm text-gray-900">{selectedApp.referralCode || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Siblings Count</label>
                      <p className="text-sm text-gray-900">{selectedApp.siblingsCount || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Mother Siblings Count</label>
                      <p className="text-sm text-gray-900">{selectedApp.motherSiblingsCount || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Pets</label>
                      <p className="text-sm text-gray-900">{selectedApp.pets || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Living Situation</label>
                      <p className="text-sm text-gray-900">{selectedApp.livingSituation || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Own Car</label>
                      <p className="text-sm text-gray-900">{selectedApp.ownCar === true ? 'Yes' : selectedApp.ownCar === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Driver License</label>
                      <p className="text-sm text-gray-900">{selectedApp.driverLicense === true ? 'Yes' : selectedApp.driverLicense === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Car Insured</label>
                      <p className="text-sm text-gray-900">{selectedApp.carInsured === true ? 'Yes' : selectedApp.carInsured === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Transportation Method</label>
                      <p className="text-sm text-gray-900">{selectedApp.transportationMethod || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Nearest Airport</label>
                      <p className="text-sm text-gray-900">{selectedApp.nearestAirport || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Airport Distance</label>
                      <p className="text-sm text-gray-900">{selectedApp.airportDistance || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Legal Problems</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.legalProblems || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Jail Time</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.jailTime || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Want More Children</label>
                      <p className="text-sm text-gray-900">{selectedApp.wantMoreChildren === true ? 'Yes' : selectedApp.wantMoreChildren === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Previous Surrogacy</label>
                      <p className="text-sm text-gray-900">{selectedApp.previousSurrogacy === true ? `Yes (${selectedApp.previousSurrogacyCount || '?'} times)` : selectedApp.previousSurrogacy === false ? 'No' : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500">Location</label>
                    <p className="text-sm text-gray-900">{selectedApp.location || 'N/A'}</p>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500">Full Address</label>
                    <p className="text-sm text-gray-900">{selectedApp.address || selectedApp.applicantAddress || 'N/A'}</p>
                  </div>
                  {selectedApp.citizenshipStatus && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500">Citizenship Status</label>
                      <p className="text-sm text-gray-900">{selectedApp.citizenshipStatus}</p>
                    </div>
                  )}
                </div>

                {/* Marital Status */}
                <div className="bg-pink-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-900 mb-4">💑 Marital Status & Family</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Marital Status</label>
                      <p className="text-sm text-gray-900">{selectedApp.maritalStatus || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Are you single?</label>
                      <p className="text-sm text-gray-900">{selectedApp.isSingle === true ? 'Yes' : selectedApp.isSingle === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Are you married?</label>
                      <p className="text-sm text-gray-900">{selectedApp.isMarried === true ? 'Yes' : selectedApp.isMarried === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Are you widowed?</label>
                      <p className="text-sm text-gray-900">{selectedApp.isWidowed === true ? 'Yes' : selectedApp.isWidowed === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Life Partner</label>
                      <p className="text-sm text-gray-900">{selectedApp.lifePartner === true ? 'Yes' : selectedApp.lifePartner === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Engaged</label>
                      <p className="text-sm text-gray-900">{selectedApp.engaged === true ? 'Yes' : selectedApp.engaged === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Spouse/Partner Name</label>
                      <p className="text-sm text-gray-900">{selectedApp.spouseName || selectedApp.partnerName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Spouse/Partner Date of Birth</label>
                      <p className="text-sm text-gray-900">{selectedApp.spouseDateOfBirth || selectedApp.partnerDateOfBirth || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Marriage Date</label>
                      <p className="text-sm text-gray-900">{selectedApp.marriageDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Wedding Date</label>
                      <p className="text-sm text-gray-900">{selectedApp.weddingDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Widowed Date</label>
                      <p className="text-sm text-gray-900">{selectedApp.widowedDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Marital Problems</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.maritalProblems || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Divorced</label>
                      <p className="text-sm text-gray-900">{selectedApp.divorced === true ? 'Yes' : selectedApp.divorced === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Divorce Date</label>
                      <p className="text-sm text-gray-900">{selectedApp.divorceDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Divorce Cause</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.divorceCause || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Remarried</label>
                      <p className="text-sm text-gray-900">{selectedApp.remarried === true ? 'Yes' : selectedApp.remarried === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Remarried Date</label>
                      <p className="text-sm text-gray-900">{selectedApp.remarriedDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Legally Separated</label>
                      <p className="text-sm text-gray-900">{selectedApp.legallySeparated === true ? 'Yes' : selectedApp.legallySeparated === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Separation Details</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.separationDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Engagement Date</label>
                      <p className="text-sm text-gray-900">{selectedApp.engagementDate || 'N/A'}</p>
                    </div>
                  </div>
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
                      <label className="block text-sm font-medium text-gray-500">Insurance Details</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.insuranceDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">State Agency Insurance</label>
                      <p className="text-sm text-gray-900">{selectedApp.stateAgencyInsurance === true ? 'Yes' : selectedApp.stateAgencyInsurance === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">State Agency Name</label>
                      <p className="text-sm text-gray-900">{selectedApp.stateAgencyName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Insurance Payment Method</label>
                      <p className="text-sm text-gray-900">{selectedApp.insurancePaymentMethod || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Delivery Hospital</label>
                      <p className="text-sm text-gray-900">{selectedApp.deliveryHospital || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Delivered at Hospital Before</label>
                      <p className="text-sm text-gray-900">{selectedApp.deliveredAtHospitalBefore === true ? 'Yes' : selectedApp.deliveredAtHospitalBefore === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Abnormal Pap Smear</label>
                      <p className="text-sm text-gray-900">{selectedApp.abnormalPapSmear === true ? 'Yes' : selectedApp.abnormalPapSmear === false ? 'No' : 'N/A'}</p>
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
                      <label className="block text-sm font-medium text-gray-500">Last Menstrual Period</label>
                      <p className="text-sm text-gray-900">{selectedApp.lastMenstrualPeriod || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Infertility Doctor</label>
                      <p className="text-sm text-gray-900">{selectedApp.infertilityDoctor === true ? 'Yes' : selectedApp.infertilityDoctor === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Infertility Details</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.infertilityDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Household Marijuana Use</label>
                      <p className="text-sm text-gray-900">{selectedApp.householdMarijuana === true ? 'Yes' : selectedApp.householdMarijuana === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Pregnancy Problems</label>
                      <p className="text-sm text-gray-900">{selectedApp.pregnancyProblems === true ? 'Yes' : selectedApp.pregnancyProblems === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Pregnancy Problems Details</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.pregnancyProblemsDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Children Health Problems</label>
                      <p className="text-sm text-gray-900">{selectedApp.childrenHealthProblems === true ? 'Yes' : selectedApp.childrenHealthProblems === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Children Health Details</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.childrenHealthDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Currently Breastfeeding</label>
                      <p className="text-sm text-gray-900">{selectedApp.breastfeeding === true ? 'Yes' : selectedApp.breastfeeding === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Breastfeeding Stop Date</label>
                      <p className="text-sm text-gray-900">{selectedApp.breastfeedingStopDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Tattoos/Piercings (Last 1.5 years)</label>
                      <p className="text-sm text-gray-900">{selectedApp.tattoosPiercings === true ? 'Yes' : selectedApp.tattoosPiercings === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Tattoos/Piercings Date</label>
                      <p className="text-sm text-gray-900">{selectedApp.tattoosPiercingsDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Depression Medication</label>
                      <p className="text-sm text-gray-900">{selectedApp.depressionMedication === true ? 'Yes' : selectedApp.depressionMedication === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Depression Medication Details</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.depressionMedicationDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Drug/Alcohol Abuse</label>
                      <p className="text-sm text-gray-900">{selectedApp.drugAlcoholAbuse === true ? 'Yes' : selectedApp.drugAlcoholAbuse === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Excess Heat Exposure</label>
                      <p className="text-sm text-gray-900">{selectedApp.excessHeat === true ? 'Yes' : selectedApp.excessHeat === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Alcohol Limit Advised</label>
                      <p className="text-sm text-gray-900">{selectedApp.alcoholLimitAdvised === true ? 'Yes' : selectedApp.alcoholLimitAdvised === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Smoking Status</label>
                      <p className="text-sm text-gray-900">{selectedApp.smokingStatus || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Smoked During Pregnancy</label>
                      <p className="text-sm text-gray-900">{selectedApp.smokedDuringPregnancy === true ? 'Yes' : selectedApp.smokedDuringPregnancy === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Alcohol Usage</label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Allergies</label>
                      <p className="text-sm text-gray-900">{selectedApp.allergies === true ? 'Yes' : selectedApp.allergies === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Allergies Details</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.allergiesDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Medications</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.currentMedications || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Children List</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.childrenList || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Surgeries</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.surgeries === true ? selectedApp.surgeryDetails || 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Step 4: Sexual History */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-purple-900 mb-4">💕 Step 4: Sexual History</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Past Contraceptives</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.pastContraceptives || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Birth Control</label>
                      <p className="text-sm text-gray-900">{selectedApp.currentBirthControl === true ? `Yes (${selectedApp.birthControlMethod || 'N/A'})` : selectedApp.currentBirthControl === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Birth Control Duration</label>
                      <p className="text-sm text-gray-900">{selectedApp.birthControlDuration || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Sexual Partner</label>
                      <p className="text-sm text-gray-900">{selectedApp.sexualPartner === true ? 'Yes' : selectedApp.sexualPartner === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Multiple Partners</label>
                      <p className="text-sm text-gray-900">{selectedApp.multiplePartners === true ? 'Yes' : selectedApp.multiplePartners === false ? 'No' : 'N/A'}</p>
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
                      <label className="block text-sm font-medium text-gray-500">Blood Transfusion</label>
                      <p className="text-sm text-gray-900">{selectedApp.bloodTransfusion === true ? 'Yes' : selectedApp.bloodTransfusion === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">STD History</label>
                      <p className="text-sm text-gray-900">{selectedApp.stdHistory === true ? 'Yes' : selectedApp.stdHistory === false ? 'No' : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">STD Details</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.stdDetails || 'N/A'}</p>
                    </div>
                  </div>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Trade School Details</label>
                      <p className="text-sm text-gray-900">{selectedApp.tradeSchoolDetails || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Step 7: General Questions & Preferences */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-orange-900 mb-4">💭 Step 7: General Questions & Preferences</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Surrogacy Understanding & Motivation</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.surrogacyUnderstanding || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Self Introduction</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.selfIntroduction || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Main Concerns</label>
                      <p className="text-sm text-gray-900">{Array.isArray(selectedApp.mainConcerns) ? selectedApp.mainConcerns.join(', ') : selectedApp.mainConcerns || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Parent Qualities</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.parentQualities || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Expected Support</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.expectedSupport || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Partner Feelings About Surrogacy</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.partnerFeelings || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Contact During Process</label>
                      <p className="text-sm text-gray-900">{selectedApp.contactDuringProcess || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Contact After Birth</label>
                      <p className="text-sm text-gray-900">{selectedApp.contactAfterBirth || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Religious Preference</p>
                      <p className="text-sm font-medium">{selectedApp.religiousPreference === true ? '✓ Yes' : selectedApp.religiousPreference === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Unmarried Couple</p>
                      <p className="text-sm font-medium">{selectedApp.unmarriedCouple === true ? '✓ Yes' : selectedApp.unmarriedCouple === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Heterosexual Couple</p>
                      <p className="text-sm font-medium">{selectedApp.heterosexualCouple === true ? '✓ Yes' : selectedApp.heterosexualCouple === false ? '✗ No' : '—'}</p>
                    </div>
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
                      <p className="text-xs text-gray-500">Egg Donor</p>
                      <p className="text-sm font-medium">{selectedApp.eggDonor === true ? '✓ Yes' : selectedApp.eggDonor === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Sperm Donor</p>
                      <p className="text-sm font-medium">{selectedApp.spermDonor === true ? '✓ Yes' : selectedApp.spermDonor === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Older Couple</p>
                      <p className="text-sm font-medium">{selectedApp.olderCouple === true ? '✓ Yes' : selectedApp.olderCouple === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Couple with Children</p>
                      <p className="text-sm font-medium">{selectedApp.coupleWithChildren === true ? '✓ Yes' : selectedApp.coupleWithChildren === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">International</p>
                      <p className="text-sm font-medium">{selectedApp.internationalCouple === true ? '✓ Yes' : selectedApp.internationalCouple === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Non-English Speaking</p>
                      <p className="text-sm font-medium">{selectedApp.nonEnglishSpeaking === true ? '✓ Yes' : selectedApp.nonEnglishSpeaking === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Carry Twins</p>
                      <p className="text-sm font-medium">{selectedApp.carryTwins === true ? '✓ Yes' : selectedApp.carryTwins === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Reduce Multiples</p>
                      <p className="text-sm font-medium">{selectedApp.reduceMultiples === true ? '✓ Yes' : selectedApp.reduceMultiples === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Amniocentesis</p>
                      <p className="text-sm font-medium">{selectedApp.amniocentesis === true ? '✓ Yes' : selectedApp.amniocentesis === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Abort for Birth Defects</p>
                      <p className="text-sm font-medium">{selectedApp.abortBirthDefects === true ? '✓ Yes' : selectedApp.abortBirthDefects === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Concerns Placing Baby</p>
                      <p className="text-sm font-medium">{selectedApp.concernsPlacingBaby === true ? '✓ Yes' : selectedApp.concernsPlacingBaby === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Parents in Delivery</p>
                      <p className="text-sm font-medium">{selectedApp.parentsInDeliveryRoom === true ? '✓ Yes' : selectedApp.parentsInDeliveryRoom === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Parents at Appointments</p>
                      <p className="text-sm font-medium">{selectedApp.parentsAtAppointments === true ? '✓ Yes' : selectedApp.parentsAtAppointments === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Hospital Notification</p>
                      <p className="text-sm font-medium">{selectedApp.hospitalNotification === true ? '✓ Yes' : selectedApp.hospitalNotification === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Parents on Birth Certificate</p>
                      <p className="text-sm font-medium">{selectedApp.parentsOnBirthCertificate === true ? '✓ Yes' : selectedApp.parentsOnBirthCertificate === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Applying Elsewhere</p>
                      <p className="text-sm font-medium">{selectedApp.applyingElsewhere === true ? '✓ Yes' : selectedApp.applyingElsewhere === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Previously Rejected</p>
                      <p className="text-sm font-medium">{selectedApp.previouslyRejected === true ? '✓ Yes' : selectedApp.previouslyRejected === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Attend Checkups</p>
                      <p className="text-sm font-medium">{selectedApp.attendPrenatalCheckups === true ? '✓ Yes' : selectedApp.attendPrenatalCheckups === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Medical Examinations</p>
                      <p className="text-sm font-medium">{selectedApp.medicalExaminations === true ? '✓ Yes' : selectedApp.medicalExaminations === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Lifestyle Guidelines</p>
                      <p className="text-sm font-medium">{selectedApp.lifestyleGuidelines === true ? '✓ Yes' : selectedApp.lifestyleGuidelines === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Avoid Long Travel</p>
                      <p className="text-sm font-medium">{selectedApp.avoidLongTravel === true ? '✓ Yes' : selectedApp.avoidLongTravel === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Refrain High-risk Work</p>
                      <p className="text-sm font-medium">{selectedApp.refrainHighRiskWork === true ? '✓ Yes' : selectedApp.refrainHighRiskWork === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Placed Child for Adoption</p>
                      <p className="text-sm font-medium">{selectedApp.placedForAdoption === true ? '✓ Yes' : selectedApp.placedForAdoption === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Non-supportive People</p>
                      <p className="text-sm font-medium">{selectedApp.nonSupportivePeople === true ? '✓ Yes' : selectedApp.nonSupportivePeople === false ? '✗ No' : '—'}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-gray-500">Child Care Support</p>
                      <p className="text-sm font-medium">{selectedApp.childCareSupport === true ? '✓ Yes' : selectedApp.childCareSupport === false ? '✗ No' : '—'}</p>
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
                      <label className="block text-sm font-medium text-gray-500">Applicant Address</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.applicantAddress || 'N/A'}</p>
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
                    onClick={async () => {
                      try {
                        await generateApplicationPDF(selectedApp);
                      } catch (error) {
                        console.error('Error generating PDF:', error);
                        alert('Error generating PDF. Please try again.');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                  {selectedApp.applicationType === 'surrogate' ? (
                    <ApproveButton 
                      id={selectedApp.id} 
                      currentStatus={selectedApp.status} 
                      onUpdate={() => {
                        loadApplications();
                        setSelectedApp(null);
                      }}
                    />
                  ) : (
                    <button
                      onClick={async () => {
                        const newStatus = selectedApp.status === 'approved' ? 'pending' : 'approved';
                        try {
                          await fetch('/api/intended-parent-applications', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: selectedApp.id, status: newStatus })
                          });
                          loadApplications();
                          setSelectedApp(null);
                        } catch (error) {
                          console.error('Error updating status:', error);
                          alert('Error updating status');
                        }
                      }}
                      className={`px-4 py-2 rounded-md text-white ${
                        selectedApp.status === 'approved' 
                          ? 'bg-yellow-500 hover:bg-yellow-600' 
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {selectedApp.status === 'approved' ? '⏳ Mark Pending' : '✅ Approve'}
                    </button>
                  )}
                </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

