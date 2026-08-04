
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import ApproveButton from '../../components/ApproveButton';
import DashboardStats from '../../components/DashboardStats';
import { generateApplicationPDF } from '../../lib/generateApplicationPDF';
import { resolveDisplayLocation, sanitizeAddressText } from '../../lib/extractLocationFromAddress';
import { resolveIpRegionDetailed, toEnglishProvinceLabel } from '../../lib/resolveIpRegion';
import { splitAirportFields } from '../../lib/splitAirportFields';
import { labelParentApplicationOption } from '../../lib/parentApplicationOptionLabels';

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
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'surrogate', 'intended_parent'
  const [selectedIds, setSelectedIds] = useState<Array<{id: string | number, type: string}>>([]);
  const [resolvingIpRegion, setResolvingIpRegion] = useState(false);
  const [adminRole, setAdminRole] = useState('');
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editJsonDrafts, setEditJsonDrafts] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [isEditingApplication, setIsEditingApplication] = useState(false);

  // 解析 Surrogate 申请数据的辅助函数
  const parseSurrogateApplicationData = (app: any, profile?: any) => {
    let formData: any = {};
    try {
      if (app.form_data) {
        formData = JSON.parse(app.form_data);
      }
    } catch (e) {
      console.error('Error parsing form_data:', e);
    }

    const address = sanitizeAddressText(formData.address || profile?.address || '');
    const location =
      resolveDisplayLocation(
        formData.location || profile?.location || app.location,
        address
      ) || 'N/A';
    const applicantIp =
      app.ip_address ||
      formData.applicantIp ||
      profile?.signup_ip ||
      null;
    const applicantIpRegion =
      app.ip_region ||
      formData.applicantIpRegion ||
      profile?.signup_ip_region ||
      null;
    
    const airportFields = splitAirportFields(formData.nearestAirport, formData.airportDistance);

    return {
      ...app,
      ...formData,
      applicationType: 'surrogate',
      // 确保基本字段存在
      full_name: app.full_name || formData.fullName || 'Unknown',
      phone: app.phone || formData.phoneNumber || 'N/A',
      email: formData.email || profile?.email || 'N/A',
      age: formData.age || 'N/A',
      dateOfBirth: formData.dateOfBirth || 'N/A',
      // City/State — derive from address when form/profile location is empty or incomplete
      location,
      address: address || 'N/A',
      applicantIp: applicantIp || null,
      applicantIpRegion: toEnglishProvinceLabel(applicantIpRegion) || null,
      // Split combined "LAX 100" style answers into airport + distance
      nearestAirport: airportFields.nearestAirport,
      airportDistance: airportFields.airportDistance,
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
    
    // Format phone number: +1(123)456-7890 (avoid duplicating country into area)
    const formatPhone = () => {
      const cc = String(formData.parent1PhoneCountryCode || '').replace(/\D/g, '');
      const area = String(formData.parent1PhoneAreaCode || '').replace(/\D/g, '');
      const local = String(formData.parent1PhoneNumber || '').replace(/\D/g, '');
      let all = `${cc}${area}${local}`;
      if (!all) return formData.parent1PhoneNumber || 'N/A';

      let country = '';
      if (all.length >= 11 && all.startsWith('1')) {
        country = '1';
        all = all.slice(1);
      } else if (all.length === 10) {
        country = cc || '1';
      } else {
        country = cc;
      }
      if (all.length >= 11 && all.startsWith('1')) {
        if (!country) country = '1';
        all = all.slice(1);
      }

      if (country === '1' && all.length === 10) {
        const a = all.slice(0, 3);
        const rest = all.slice(3);
        return `+1(${a})${rest.slice(0, 3)}-${rest.slice(3)}`;
      }
      if (formData.parent1PhoneCountryCode && formData.parent1PhoneAreaCode && formData.parent1PhoneNumber) {
        return `+${formData.parent1PhoneCountryCode}(${formData.parent1PhoneAreaCode})${formData.parent1PhoneNumber}`;
      }
      if (formData.parent1PhoneNumber) return formData.parent1PhoneNumber;
      if (formData.parent1PhoneCountryCode) return `+${formData.parent1PhoneCountryCode}`;
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
      applicantIp: app.ip_address || formData.applicantIp || null,
      applicantIpRegion: toEnglishProvinceLabel(app.ip_region || formData.applicantIpRegion) || null,
      submitted_at: app.submitted_at || app.created_at,
      // Photos array (for multiple photos, up to 4)
      photos: formData.photos || (formData.photoUrl ? [formData.photoUrl] : []),
      // Backward compatibility: keep photoUrl if photos array is empty
      photoUrl: formData.photoUrl || (formData.photos && formData.photos.length > 0 ? formData.photos[0] : null),
    };
  };

  // 解析仅 Sign Up 的用户（未提交申请表）
  const parseSignupProfileData = (profile: any) => {
    const role = (profile?.role || '').toLowerCase();
    const roleLabel = role === 'parent' ? 'Parent' : role === 'surrogate' ? 'Surrogate' : 'User';

    return {
      ...profile,
      id: profile.id,
      applicationType: 'signup',
      signupRole: role,
      full_name: profile.name || profile.full_name || 'Unknown',
      phone: profile.phone || 'N/A',
      email: profile.email || 'N/A',
      location: resolveDisplayLocation(profile.location, profile.address) || profile.location || profile.address || 'N/A',
      applicantIp: profile.signup_ip || null,
      applicantIpRegion: toEnglishProvinceLabel(profile.signup_ip_region) || null,
      status: 'registered',
      signupSource: `Sign Up (${roleLabel})`,
      submitted_at: profile.created_at,
    };
  };

  const loadApplications = async () => {
    try {
      setLoading(true);

      const authRes = await fetch('/api/auth/check');
      if (authRes.ok) {
        const authData = await authRes.json();
        const role = (authData.user?.role || '').toLowerCase();
        setAdminRole(role);
        if (role === 'branch_manager') {
          router.replace('/matches');
          return;
        }
      }

      // 同时加载 Surrogate 申请、Intended Parent 申请和 profiles
      const [surrogateRes, intendedParentRes, profilesRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*')
          .order('created_at', { ascending: false }),
        fetch('/api/intended-parent-applications').then(res => res.json()),
        supabase
          .from('profiles')
          .select('*')
          .in('role', ['surrogate', 'parent'])
          .order('created_at', { ascending: false }),
      ]);

      if (surrogateRes.error) throw surrogateRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profilesById = new Map<string, any>(
        (profilesRes.data || []).map((p: any) => [String(p.id), p])
      );
      
      // 解析 Surrogate 申请（用 profile.location/address 补全）
      const parsedSurrogateApps = (surrogateRes.data || []).map((app: any) =>
        parseSurrogateApplicationData(app, app?.user_id ? profilesById.get(String(app.user_id)) : undefined)
      );
      
      // 解析 Intended Parent 申请
      const parsedIntendedParentApps = (intendedParentRes.data || []).map((app: any) => {
        const profile = app?.user_id ? profilesById.get(String(app.user_id)) : undefined;
        const parsed = parseIntendedParentApplicationData(app);
        if (!parsed.applicantIp && profile?.signup_ip) {
          parsed.applicantIp = profile.signup_ip;
        }
        if (!parsed.applicantIpRegion && profile?.signup_ip_region) {
          parsed.applicantIpRegion = profile.signup_ip_region;
        }
        return parsed;
      });

      // 找出已经提交申请的用户 ID（避免和 Sign Up 用户重复）
      const appliedUserIds = new Set<string>();
      (surrogateRes.data || []).forEach((app: any) => {
        if (app?.user_id) appliedUserIds.add(String(app.user_id));
      });
      (intendedParentRes.data || []).forEach((app: any) => {
        if (app?.user_id) appliedUserIds.add(String(app.user_id));
      });

      // 仅 Sign Up（未提交申请）的 parent/surrogate 用户
      const signupOnlyUsers = (profilesRes.data || [])
        .filter((profile: any) => profile?.id && !appliedUserIds.has(String(profile.id)))
        .map(parseSignupProfileData);
      
      // 合并并排序（按提交日期，最新的在前）
      const allApplications = [...parsedSurrogateApps, ...parsedIntendedParentApps, ...signupOnlyUsers].sort((a, b) => {
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

  // Always re-resolve region from IP when opening a detail view.
  // Stored signup_ip_region may be wrong if it came from an inaccurate global geo DB.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedApp) return;
      const ip = String(
        selectedApp.applicantIp || selectedApp.signup_ip || selectedApp.ip_address || ''
      ).trim();
      if (!ip || ip === 'N/A') return;
      setResolvingIpRegion(true);
      try {
        const storedRegion = String(selectedApp.applicantIpRegion || '').trim() || null;
        const isV6 = ip.includes(':');
        const detailed = await resolveIpRegionDetailed(ip);
        if (!cancelled) {
          if (detailed.confidence === 'high' && detailed.region) {
            setSelectedApp((prev: any) =>
              prev && prev.applicantIpRegion !== detailed.region
                ? { ...prev, applicantIpRegion: detailed.region }
                : prev
            );
          } else if (isV6 && storedRegion && storedRegion !== 'China') {
            // Contested IPv6 province (e.g. Shanghai vs Heilongjiang) — don't keep a wrong single-source label
            setSelectedApp((prev: any) =>
              prev ? { ...prev, applicantIpRegion: 'China' } : prev
            );
          }
        }
      } finally {
        if (!cancelled) setResolvingIpRegion(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedApp?.id, selectedApp?.applicationType, selectedApp?.applicantIp]);

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
      (statusFilter === 'registered' && app.status === 'registered') ||
      app.status === statusFilter;
    
    const matchesType = typeFilter === 'all' || app.applicationType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const isActionableApplication = (app: any) =>
    app.applicationType === 'surrogate' || app.applicationType === 'intended_parent';

  const canEditApplications = adminRole === 'admin';

  const META_EDIT_KEYS = new Set([
    'id',
    'user_id',
    'status',
    'created_at',
    'updated_at',
    'submitted_at',
    'form_data',
    'applicationType',
    'signupRole',
    'signupSource',
    'ip_address',
    'ip_region',
    'applicantIp',
    'applicantIpRegion',
  ]);

  const extractEditableFormData = (app: any): Record<string, any> => {
    let raw: any = null;
    if (app?.form_data != null) {
      try {
        raw =
          typeof app.form_data === 'string'
            ? JSON.parse(app.form_data || '{}')
            : app.form_data;
      } catch {
        raw = null;
      }
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      raw = {};
      Object.keys(app || {}).forEach((key) => {
        if (!META_EDIT_KEYS.has(key)) raw[key] = app[key];
      });
    }
    return { ...raw };
  };

  const openEditApplication = (app: any) => {
    if (!canEditApplications || !isActionableApplication(app)) return;
    const formData = extractEditableFormData(app);
    // Ensure denormalized contact fields exist for surrogate apps
    if (app.applicationType === 'surrogate') {
      if (formData.fullName == null && app.full_name && app.full_name !== 'N/A') {
        formData.fullName = app.full_name;
      }
      if (formData.phoneNumber == null && app.phone && app.phone !== 'N/A') {
        formData.phoneNumber = app.phone;
      }
      if (formData.email == null && app.email && app.email !== 'N/A') {
        formData.email = app.email;
      }
      if (formData.location == null && app.location && app.location !== 'N/A') {
        formData.location = app.location;
      }
      const airportFields = splitAirportFields(formData.nearestAirport, formData.airportDistance);
      formData.nearestAirport = airportFields.nearestAirport ?? '';
      formData.airportDistance = airportFields.airportDistance ?? '';
    }
    setEditingApp(app);
    setSelectedApp(app);
    setEditFormData(formData);
    setEditJsonDrafts({});
    setIsEditingApplication(true);
  };

  const updateEditField = (key: string, value: any) => {
    setEditFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingApp || !canEditApplications) return;

    // Parse any open JSON drafts before save
    const merged = { ...editFormData };
    for (const [key, draft] of Object.entries(editJsonDrafts)) {
      try {
        merged[key] = draft.trim() === '' ? null : JSON.parse(draft);
      } catch {
        alert(`Invalid JSON in field "${key}". Please fix before saving.`);
        return;
      }
    }

    setSavingEdit(true);
    try {
      if (editingApp.applicationType === 'surrogate') {
        const res = await fetch('/api/applications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingApp.id,
            form_data: merged,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
      } else if (editingApp.applicationType === 'intended_parent') {
        const res = await fetch('/api/intended-parent-applications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingApp.id,
            fields: merged,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
      }
      setEditingApp(null);
      setIsEditingApplication(false);
      setEditFormData({});
      setEditJsonDrafts({});
      setSelectedApp(null);
      await loadApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to save application');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(
        filteredApplications
          .filter(isActionableApplication)
          .map(app => ({ id: app.id, type: app.applicationType }))
      );
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

  const readField = (key: string, aliases: string[] = []) => {
    if (isEditingApplication) {
      for (const k of [key, ...aliases]) {
        if (editFormData[k] !== undefined) return editFormData[k];
      }
    }
    for (const k of [key, ...aliases]) {
      if (selectedApp?.[k] !== undefined && selectedApp?.[k] !== null && selectedApp?.[k] !== '') return selectedApp[k];
    }
    return selectedApp?.[key];
  };

  const renderTextField = (label: string, key: string, opts?: { multiline?: boolean; className?: string; aliases?: string[] }) => {
    const raw = readField(key, opts?.aliases);
    let display = 'N/A';
    if (raw === true) display = 'Yes';
    else if (raw === false) display = 'No';
    else if (raw != null && raw !== '') {
      const labeled = labelParentApplicationOption(raw);
      display = labeled || String(raw);
    }
    return (
      <div className={opts?.className}>
        <label className="block text-sm font-medium text-gray-500">{label}</label>
        {isEditingApplication ? (
          opts?.multiline ? (
            <textarea
              value={raw == null ? '' : Array.isArray(raw) ? raw.join(', ') : String(raw)}
              onChange={(e) => updateEditField(key, e.target.value)}
              rows={4}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            />
          ) : (
            <input
              type="text"
              value={raw == null ? '' : Array.isArray(raw) ? raw.join(', ') : String(raw)}
              onChange={(e) => updateEditField(key, e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            />
          )
        ) : (
          <p className={`text-sm text-gray-900${opts?.multiline ? ' whitespace-pre-wrap' : ''}`}>{display}</p>
        )}
      </div>
    );
  };

  const renderBoolField = (label: string, key: string, opts?: { className?: string; aliases?: string[] }) => {
    const raw = readField(key, opts?.aliases);
    return (
      <div className={opts?.className}>
        <label className="block text-sm font-medium text-gray-500">{label}</label>
        {isEditingApplication ? (
          <select
            value={raw === true ? 'true' : raw === false ? 'false' : ''}
            onChange={(e) => {
              const v = e.target.value;
              updateEditField(key, v === '' ? null : v === 'true');
            }}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">N/A</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : (
          <p className="text-sm text-gray-900">{raw === true ? 'Yes' : raw === false ? 'No' : 'N/A'}</p>
        )}
      </div>
    );
  };

  const renderJsonField = (label: string, key: string, opts?: { className?: string; aliases?: string[] }) => {
    const raw = readField(key, opts?.aliases);
    return (
      <div className={opts?.className}>
        <label className="block text-sm font-medium text-gray-500">{label}</label>
        {isEditingApplication ? (
          <textarea
            value={editJsonDrafts[key] ?? JSON.stringify(raw ?? null, null, 2)}
            onChange={(e) => setEditJsonDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
            rows={6}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-mono bg-white"
          />
        ) : (
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {raw == null || raw === '' ? 'N/A' : typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)}
          </p>
        )}
      </div>
    );
  };

  const getDisplayPhotos = (): string[] => {
    const raw = isEditingApplication
      ? (editFormData.photos ?? selectedApp?.photos)
      : selectedApp?.photos;
    if (Array.isArray(raw)) {
      return raw.filter((url): url is string => typeof url === 'string' && url.trim() !== '');
    }
    const legacy = isEditingApplication
      ? (editFormData.photoUrl ?? selectedApp?.photoUrl)
      : selectedApp?.photoUrl;
    return typeof legacy === 'string' && legacy.trim() !== '' ? [legacy] : [];
  };

  const renderPhotoGallery = (label: string, accentClass: string) => {
    const photos = getDisplayPhotos();
    if (photos.length === 0) return null;
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-500 mb-2">
          {label} ({photos.length} photos)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photoUrl, index) => (
            <div key={`${photoUrl}-${index}`} className="relative">
              <img
                src={photoUrl}
                alt={`${label} ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg border border-gray-300 shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <a
                href={photoUrl}
                download
                className={`absolute top-2 right-2 ${accentClass} text-white px-2 py-1 rounded text-xs hover:opacity-90`}
              >
                Download
              </a>
              <div className="mt-1 text-xs text-gray-500 text-center">Photo {index + 1}</div>
            </div>
          ))}
        </div>
      </div>
    );
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
          <p className="text-gray-600">Manage applications and Sign Up users (parent/surrogate)</p>
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
                <option value="registered">Registered</option>
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
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={
                        filteredApplications.filter(isActionableApplication).length > 0 &&
                        selectedIds.length === filteredApplications.filter(isActionableApplication).length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th scope="col" className="w-36 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th scope="col" className="w-56 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications?.map((app: any) => (
                  <tr key={`${app.applicationType}-${app.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input
                        type="checkbox"
                        checked={selectedIds.some(item => item.id === app.id && item.type === app.applicationType)}
                        onChange={(e) => handleSelectOne(app.id, app.applicationType, e.target.checked)}
                        disabled={!isActionableApplication(app)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                        app.applicationType === 'intended_parent'
                          ? 'bg-purple-100 text-purple-800'
                          : app.applicationType === 'signup'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {app.applicationType === 'intended_parent'
                          ? 'Intended Parent'
                          : app.applicationType === 'signup'
                          ? app.signupSource || 'Sign Up'
                          : 'Surrogate'}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.submitted_at || app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{app.full_name}</div>
                        {app.applicationType === 'surrogate' ? (
                          <div className="text-sm text-gray-500 truncate">
                            {app.age ? `Age: ${app.age}` : 'Age not provided'} 
                            {app.previousSurrogacy && ' • Previous Surrogate'}
                          </div>
                        ) : app.applicationType === 'signup' ? (
                          <div className="text-sm text-gray-500 truncate">
                            {app.signupRole === 'parent' ? 'Signed up as Parent' : 'Signed up as Surrogate'}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 truncate">
                            {app.parent2FirstName && app.parent2LastName 
                              ? `Couple: ${app.parent1FirstName} ${app.parent1LastName} & ${app.parent2FirstName} ${app.parent2LastName}`
                              : `Single: ${app.parent1FirstName} ${app.parent1LastName}`
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 truncate">{app.phone}</div>
                        <div className="text-sm text-gray-500 truncate">{app.email}</div>
                        {app.location && app.location !== 'N/A' && (
                          <div className="text-xs text-gray-400 mt-1 truncate">
                            📍 {app.location}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full 
                        ${app.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                          app.status === 'registered' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {app.status ? app.status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <button
                          onClick={() => {
                            setResolvingIpRegion(true);
                            setSelectedApp(app);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                        >
                          📋 View
                        </button>
                        {canEditApplications && isActionableApplication(app) && (
                          <button
                            onClick={() => openEditApplication(app)}
                            className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {isActionableApplication(app) && (
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
                        )}
                        {app.applicationType === 'surrogate' ? (
                          <ApproveButton 
                            id={app.id} 
                            currentStatus={app.status} 
                            onUpdate={loadApplications}
                          />
                        ) : app.applicationType === 'intended_parent' ? (
                          <IntendedParentApproveButton 
                            id={app.id} 
                            currentStatus={app.status} 
                            onUpdate={loadApplications}
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">No review needed</span>
                        )}
                        {isActionableApplication(app) && (
                          <button
                            onClick={() => handleDeleteApplication(app.id, app.full_name, app.applicationType)}
                            className="text-gray-500 hover:text-red-600 text-xs font-medium"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredApplications.length === 0 && applications.length > 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No applications match your search criteria.
                    </td>
                  </tr>
                )}
                {applications.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No applications or sign up users found.
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
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isEditingApplication ? 'Edit Application' : 'Application Details'} - {selectedApp.full_name}
                  </h2>
                  {isEditingApplication && (
                    <p className="mt-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1 inline-block">
                      ✏️ Editing — only admins can save changes
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedApp(null); setIsEditingApplication(false); setEditFormData({}); setEditJsonDrafts({}); setEditingApp(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {selectedApp.applicationType === 'signup' ? (
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-indigo-900 mb-4">👤 Sign Up User Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Role</label>
                        <p className="text-sm text-gray-900">
                          {selectedApp.signupRole === 'parent' ? 'Parent' : selectedApp.signupRole === 'surrogate' ? 'Surrogate' : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Status</label>
                        <p className="text-sm text-gray-900">REGISTERED (Sign Up only)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Full Name</label>
                        <p className="text-sm text-gray-900">{selectedApp.full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm text-gray-900">{selectedApp.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-sm text-gray-900">{selectedApp.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Location</label>
                        <p className="text-sm text-gray-900">{selectedApp.location || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Applicant IP Region (Province/State)</label>
                        <p className="text-sm text-gray-900">
                          {(resolvingIpRegion ? 'Resolving…' : null) ||
                            toEnglishProvinceLabel(selectedApp.applicantIpRegion) ||
                            'N/A'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-500">Created At</label>
                        <p className="text-sm text-gray-900">
                          {selectedApp.created_at ? new Date(selectedApp.created_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : selectedApp.applicationType === 'intended_parent' ? (
                  <>
                    {/* Intended Parent Application Template */}
                    {/* Step 1: Family Structure & Basic Information */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-blue-900 mb-4">👨‍👩‍👧 Step 1: Family Structure & Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {renderTextField('Family Structure', 'familyStructure')}
                        {renderTextField('How Did You Hear About Us', 'hearAboutUs')}
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Applicant IP Region (Province/State)</label>
                          <p className="text-sm text-gray-900">
                            {(resolvingIpRegion ? 'Resolving…' : null) ||
                              toEnglishProvinceLabel(selectedApp.applicantIpRegion) ||
                              'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Intended Parent 1 */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-green-900 mb-4">👤 Intended Parent 1</h3>
                      
                      {/* Intended Parent Photos (up to 4) */}
                      {renderPhotoGallery('Intended Parent Photos', 'bg-green-600')}
                      
                      <div className="grid grid-cols-3 gap-4">
                        {renderTextField('First Name', 'parent1FirstName')}
                        {renderTextField('Last Name', 'parent1LastName')}
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                          {isEditingApplication ? (
                            <div className="grid grid-cols-3 gap-1 mt-1">
                              <input type="text" placeholder="MM" value={editFormData.parent1DateOfBirthMonth ?? ''} onChange={(e) => updateEditField('parent1DateOfBirthMonth', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                              <input type="text" placeholder="DD" value={editFormData.parent1DateOfBirthDay ?? ''} onChange={(e) => updateEditField('parent1DateOfBirthDay', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                              <input type="text" placeholder="YYYY" value={editFormData.parent1DateOfBirthYear ?? ''} onChange={(e) => updateEditField('parent1DateOfBirthYear', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                            </div>
                          ) : (
                            <p className="text-sm text-gray-900">
                              {selectedApp.parent1DateOfBirthMonth && selectedApp.parent1DateOfBirthDay && selectedApp.parent1DateOfBirthYear
                                ? `${selectedApp.parent1DateOfBirthMonth}/${selectedApp.parent1DateOfBirthDay}/${selectedApp.parent1DateOfBirthYear}`
                                : 'N/A'}
                            </p>
                          )}
                        </div>
                        {renderTextField('Gender', 'parent1Gender')}
                        {renderTextField('Blood Type', 'parent1BloodType')}
                        {renderTextField('Citizenship', 'parent1Citizenship')}
                        {renderTextField('Country/State of Residence', 'parent1CountryState')}
                        {renderTextField('Occupation', 'parent1Occupation')}
                        {renderTextField('Languages', 'parent1Languages')}
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Phone</label>
                          {isEditingApplication ? (
                            <div className="grid grid-cols-3 gap-1 mt-1">
                              <input type="text" placeholder="+Code" value={editFormData.parent1PhoneCountryCode ?? ''} onChange={(e) => updateEditField('parent1PhoneCountryCode', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                              <input type="text" placeholder="Area" value={editFormData.parent1PhoneAreaCode ?? ''} onChange={(e) => updateEditField('parent1PhoneAreaCode', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                              <input type="text" placeholder="Number" value={editFormData.parent1PhoneNumber ?? ''} onChange={(e) => updateEditField('parent1PhoneNumber', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                            </div>
                          ) : (
                            <p className="text-sm text-gray-900">
                              {selectedApp.parent1PhoneCountryCode && selectedApp.parent1PhoneAreaCode && selectedApp.parent1PhoneNumber
                                ? `+${selectedApp.parent1PhoneCountryCode} (${selectedApp.parent1PhoneAreaCode}) ${selectedApp.parent1PhoneNumber}`
                                : selectedApp.parent1PhoneNumber || 'N/A'}
                            </p>
                          )}
                        </div>
                        {renderTextField('Email', 'parent1Email')}
                        {renderTextField('Emergency Contact', 'parent1EmergencyContact')}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {renderTextField('Address Street', 'parent1AddressStreet')}
                        {renderTextField('Address Street 2', 'parent1AddressStreet2')}
                        {renderTextField('City', 'parent1AddressCity')}
                        {renderTextField('State', 'parent1AddressState')}
                        {renderTextField('ZIP', 'parent1AddressZip')}
                      </div>
                      {!isEditingApplication && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-500">Address (Full)</label>
                          <p className="text-sm text-gray-900">
                            {selectedApp.parent1AddressStreet || 'N/A'}
                            {selectedApp.parent1AddressStreet2 && `, ${selectedApp.parent1AddressStreet2}`}
                            {selectedApp.parent1AddressCity && `, ${selectedApp.parent1AddressCity}`}
                            {selectedApp.parent1AddressState && `, ${selectedApp.parent1AddressState}`}
                            {selectedApp.parent1AddressZip && ` ${selectedApp.parent1AddressZip}`}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Intended Parent 2 */}
                    {(selectedApp.parent2FirstName || selectedApp.parent2LastName || isEditingApplication) && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-purple-900 mb-4">👤 Intended Parent 2</h3>
                        <div className="grid grid-cols-3 gap-4">
                          {renderTextField('First Name', 'parent2FirstName')}
                          {renderTextField('Last Name', 'parent2LastName')}
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                            {isEditingApplication ? (
                              <div className="grid grid-cols-3 gap-1 mt-1">
                                <input type="text" placeholder="MM" value={editFormData.parent2DateOfBirthMonth ?? ''} onChange={(e) => updateEditField('parent2DateOfBirthMonth', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                                <input type="text" placeholder="DD" value={editFormData.parent2DateOfBirthDay ?? ''} onChange={(e) => updateEditField('parent2DateOfBirthDay', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                                <input type="text" placeholder="YYYY" value={editFormData.parent2DateOfBirthYear ?? ''} onChange={(e) => updateEditField('parent2DateOfBirthYear', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                              </div>
                            ) : (
                              <p className="text-sm text-gray-900">
                                {selectedApp.parent2DateOfBirthMonth && selectedApp.parent2DateOfBirthDay && selectedApp.parent2DateOfBirthYear
                                  ? `${selectedApp.parent2DateOfBirthMonth}/${selectedApp.parent2DateOfBirthDay}/${selectedApp.parent2DateOfBirthYear}`
                                  : 'N/A'}
                              </p>
                            )}
                          </div>
                          {renderTextField('Gender', 'parent2Gender')}
                          {renderTextField('Blood Type', 'parent2BloodType')}
                          {renderTextField('Citizenship', 'parent2Citizenship')}
                          {renderTextField('Country/State of Residence', 'parent2CountryState')}
                          {renderTextField('Occupation', 'parent2Occupation')}
                          {renderTextField('Languages', 'parent2Languages')}
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Phone</label>
                            {isEditingApplication ? (
                              <div className="grid grid-cols-3 gap-1 mt-1">
                                <input type="text" placeholder="+Code" value={editFormData.parent2PhoneCountryCode ?? ''} onChange={(e) => updateEditField('parent2PhoneCountryCode', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                                <input type="text" placeholder="Area" value={editFormData.parent2PhoneAreaCode ?? ''} onChange={(e) => updateEditField('parent2PhoneAreaCode', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                                <input type="text" placeholder="Number" value={editFormData.parent2PhoneNumber ?? ''} onChange={(e) => updateEditField('parent2PhoneNumber', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                              </div>
                            ) : (
                              <p className="text-sm text-gray-900">
                                {selectedApp.parent2PhoneCountryCode && selectedApp.parent2PhoneAreaCode && selectedApp.parent2PhoneNumber
                                  ? `+${selectedApp.parent2PhoneCountryCode} (${selectedApp.parent2PhoneAreaCode}) ${selectedApp.parent2PhoneNumber}`
                                  : selectedApp.parent2PhoneNumber || 'N/A'}
                              </p>
                            )}
                          </div>
                          {renderTextField('Email', 'parent2Email')}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Family Background */}
                    <div className="bg-pink-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-pink-900 mb-4">👨‍👩‍👧‍👦 Step 3: Family Background</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {renderTextField('How Long Have You Been Together', 'howLongTogether')}
                        {renderBoolField('Do You Have Any Children', 'haveChildren')}
                        {(selectedApp.haveChildren || isEditingApplication) && (
                          renderTextField('Children Details', 'childrenDetails', { multiline: true, className: 'col-span-2' })
                        )}
                      </div>
                    </div>

                    {/* Step 4: Medical & Fertility History */}
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-yellow-900 mb-4">🏥 Step 4: Medical & Fertility History</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Reason for Pursuing Surrogacy</label>
                          {isEditingApplication ? (
                            <input type="text" value={editFormData.reasonForSurrogacy == null ? '' : Array.isArray(editFormData.reasonForSurrogacy) ? editFormData.reasonForSurrogacy.join(', ') : String(editFormData.reasonForSurrogacy)} onChange={(e) => updateEditField('reasonForSurrogacy', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" />
                          ) : (
                            <p className="text-sm text-gray-900">
                              {labelParentApplicationOption(selectedApp.reasonForSurrogacy) || 'N/A'}
                            </p>
                          )}
                        </div>
                        {renderBoolField('Have You Undergone IVF', 'undergoneIVF')}
                        {renderBoolField('Do You Need Donor Eggs', 'needDonorEggs')}
                        {renderBoolField('Do You Need Donor Sperm', 'needDonorSperm')}
                        {renderBoolField('Do You Currently Have Embryos', 'haveEmbryos')}
                        {renderTextField('Number of Embryos', 'numberOfEmbryos')}
                        {renderBoolField('PGT-A Tested', 'pgtATested')}
                        {renderTextField('Embryo Development Day', 'embryoDevelopmentDay')}
                        {renderTextField('Frozen at Which Clinic', 'frozenAtClinic')}
                        {renderTextField('Clinic Email', 'clinicEmail')}
                        {renderTextField('Fertility Doctor Name', 'fertilityDoctorName')}
                        {renderTextField('HIV/Hepatitis/STD Status', 'hivHepatitisStdStatus', { multiline: true })}
                      </div>
                    </div>

                    {/* Step 5: Surrogate Preferences */}
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-indigo-900 mb-4">💝 Step 5: Surrogate Preferences</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {renderTextField('Preferred Surrogate Age Range', 'preferredSurrogateAgeRange')}
                        {renderTextField('Surrogate Location Preference', 'surrogateLocationPreference')}
                        {(selectedApp.surrogateLocationPreference === 'specific_states' || isEditingApplication) && renderTextField('Specific States', 'specificStates')}
                        {renderBoolField('Accept Surrogate with Previous C-sections', 'acceptPreviousCsection')}
                        {renderBoolField('Prefer Surrogate Who Does Not Work During Pregnancy', 'preferNoWorkDuringPregnancy')}
                        {renderBoolField('Prefer Surrogate with Stable Home Environment', 'preferStableHome')}
                        {renderBoolField('Prefer Surrogate with Flexible Schedule', 'preferFlexibleSchedule')}
                        {renderBoolField('Do You Have Diet Preference During Pregnancy', 'dietPreferenceYes')}
                        {(selectedApp.dietPreferenceYes || isEditingApplication) && renderTextField('Diet Preference', 'dietPreference')}
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Communication Preferences</label>
                          {isEditingApplication ? (
                            <input type="text" value={editFormData.communicationPreference == null ? '' : Array.isArray(editFormData.communicationPreference) ? editFormData.communicationPreference.join(', ') : String(editFormData.communicationPreference)} onChange={(e) => updateEditField('communicationPreference', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" />
                          ) : (
                            <p className="text-sm text-gray-900">
                              {labelParentApplicationOption(selectedApp.communicationPreference) || 'N/A'}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Relationship Style With Surrogate</label>
                          {isEditingApplication ? (
                            <input type="text" value={editFormData.relationshipStyle == null ? '' : Array.isArray(editFormData.relationshipStyle) ? editFormData.relationshipStyle.join(', ') : String(editFormData.relationshipStyle)} onChange={(e) => updateEditField('relationshipStyle', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" />
                          ) : (
                            <p className="text-sm text-gray-900">
                              {labelParentApplicationOption(selectedApp.relationshipStyle) || 'N/A'}
                            </p>
                          )}
                        </div>
                        {renderBoolField('Prefer Surrogate to Follow Specific OB/GYN Guidelines', 'preferSpecificObGynGuidelines')}
                      </div>
                    </div>

                    {/* Step 6: Additional Surrogate Preferences */}
                    <div className="bg-teal-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-teal-900 mb-4">💝 Step 6: Additional Surrogate Preferences</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {renderBoolField('Prefer Surrogate to Avoid Heavy Lifting', 'preferAvoidHeavyLifting')}
                        {renderBoolField('Prefer Surrogate to Avoid Travel During Pregnancy', 'preferAvoidTravel')}
                        {renderBoolField('Comfortable with Surrogate Delivering in Her Local Hospital', 'comfortableWithLocalHospital')}
                        {renderBoolField('Prefer Surrogate Who is Open to Selective Reduction', 'preferOpenToSelectiveReduction')}
                        {renderBoolField('Prefer Surrogate Who is Open to Termination for Medical Reasons', 'preferOpenToTerminationMedical')}
                        {renderTextField('Prefer Surrogate with Previous Surrogacy Experience', 'preferPreviousSurrogacyExperience')}
                        {renderBoolField('Prefer Surrogate with Strong Support System', 'preferStrongSupportSystem')}
                        {renderTextField('Prefer Surrogate Who is Married', 'preferMarried')}
                        {renderBoolField('Prefer Surrogate with Stable Income', 'preferStableIncome')}
                        {renderTextField('Prefer Surrogate Who is Comfortable with Intended Parents Attending Appointments', 'preferComfortableWithAppointments')}
                        {renderTextField('Prefer Surrogate Who is Comfortable with Intended Parents Being Present at Birth', 'preferComfortableWithBirth')}
                      </div>
                    </div>

                    {/* Step 7: General Questions */}
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-orange-900 mb-4">❓ Step 7: General Questions</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {renderBoolField('Will You Transfer More Than One Embryo', 'willTransferMoreThanOneEmbryo')}
                        {renderTextField('Attorney Name', 'attorneyName')}
                        {renderTextField('Attorney Email', 'attorneyEmail')}
                        {renderBoolField('Do You Have a Translator', 'haveTranslator')}
                        {(selectedApp.haveTranslator || isEditingApplication) && (
                          <>
                            {renderTextField('Translator Name', 'translatorName')}
                            {renderTextField('Translator Email', 'translatorEmail')}
                          </>
                        )}
                        {renderBoolField('Are You Prepared for the Possibility of a Failed Embryo Transfer', 'preparedForFailedTransfer')}
                        {renderBoolField('Are You Willing to Attempt Multiple Cycles if Needed', 'willingToAttemptMultipleCycles')}
                        {renderBoolField('Are You Emotionally Prepared for the Full Surrogacy Journey', 'emotionallyPrepared')}
                        {renderBoolField('Are You Able to Handle Potential Delays or Medical Risks', 'ableToHandleDelaysOrRisks')}
                      </div>
                    </div>

                    {/* Step 8: Letter to Surrogate */}
                    <div className="bg-red-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-red-900 mb-4">💌 Step 8: Letter to Surrogate</h3>
                      {renderTextField('Letter to Surrogate', 'letterToSurrogate', { multiline: true })}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Surrogate Application Template */}
                    {/* Step 1: Personal Information */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-blue-900 mb-4">👤 Step 1: Personal Information</h3>
                      
                      {/* Surrogate Lifestyle Photos (6 photos) */}
                      {renderPhotoGallery('Lifestyle Photos', 'bg-blue-600')}
                      
                  <div className="grid grid-cols-3 gap-4">
                    {renderTextField('Full Name', 'fullName', { aliases: ['full_name'] })}
                    {renderTextField('First Name', 'firstName')}
                    {renderTextField('Middle Name', 'middleName')}
                    {renderTextField('Last Name', 'lastName')}
                    {renderTextField('Date of Birth', 'dateOfBirth')}
                    {renderTextField('Age', 'age')}
                    {renderTextField('Blood Type', 'bloodType')}
                    {renderTextField('Height', 'height')}
                    {renderTextField('Weight', 'weight')}
                    {renderTextField('Race/Ethnicity', 'race')}
                    {renderTextField('Religious Background', 'religiousBackground')}
                    {renderBoolField('Practicing Religion', 'practicingReligion')}
                    {renderBoolField('US Citizen', 'usCitizen')}
                    {renderTextField('Phone', 'phoneNumber', { aliases: ['phone'] })}
                    {renderTextField('Email', 'email')}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Applicant IP Region (Province/State)</label>
                      <p className="text-sm text-gray-900">
                        {(resolvingIpRegion ? 'Resolving…' : null) ||
                          toEnglishProvinceLabel(selectedApp.applicantIpRegion) ||
                          'N/A'}
                      </p>
                    </div>
                    {renderTextField('How Did You Hear About Us', 'hearAboutUs')}
                    {renderTextField('Referral Code', 'referralCode')}
                    {renderTextField('Siblings Count', 'siblingsCount')}
                    {renderTextField('Mother Siblings Count', 'motherSiblingsCount')}
                    {renderTextField('Pets', 'pets')}
                    {renderTextField('Living Situation', 'livingSituation')}
                    {renderBoolField('Own Car', 'ownCar')}
                    {renderBoolField('Driver License', 'driverLicense')}
                    {renderBoolField('Car Insured', 'carInsured')}
                    {renderTextField('Transportation Method', 'transportationMethod')}
                    {renderTextField('Nearest Airport', 'nearestAirport')}
                    {renderTextField('Airport Distance', 'airportDistance')}
                    {renderTextField('Legal Problems', 'legalProblems', { multiline: true })}
                    {renderTextField('Jail Time', 'jailTime', { multiline: true })}
                    {renderBoolField('Want More Children', 'wantMoreChildren')}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Previous Surrogacy</label>
                      {isEditingApplication ? (
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <select value={editFormData.previousSurrogacy === true ? 'true' : editFormData.previousSurrogacy === false ? 'false' : ''} onChange={(e) => { const v = e.target.value; updateEditField('previousSurrogacy', v === '' ? null : v === 'true'); }} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white">
                            <option value="">N/A</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                          <input type="text" placeholder="Count" value={editFormData.previousSurrogacyCount ?? ''} onChange={(e) => updateEditField('previousSurrogacyCount', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900">{selectedApp.previousSurrogacy === true ? `Yes (${selectedApp.previousSurrogacyCount || '?'} times)` : selectedApp.previousSurrogacy === false ? 'No' : 'N/A'}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {renderTextField('Location', 'location')}
                    {renderTextField('Full Address', 'address', { aliases: ['applicantAddress'] })}
                    {renderTextField('Citizenship Status', 'citizenshipStatus')}
                  </div>
                </div>

                {/* Marital Status */}
                <div className="bg-pink-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-900 mb-4">💑 Marital Status & Family</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {renderTextField('Marital Status', 'maritalStatus')}
                    {renderBoolField('Are you single?', 'isSingle')}
                    {renderBoolField('Are you married?', 'isMarried')}
                    {renderBoolField('Are you widowed?', 'isWidowed')}
                    {renderBoolField('Life Partner', 'lifePartner')}
                    {renderBoolField('Engaged', 'engaged')}
                    {renderTextField('Spouse/Partner Name', 'spouseName', { aliases: ['partnerName'] })}
                    {renderTextField('Spouse/Partner Date of Birth', 'spouseDateOfBirth', { aliases: ['partnerDateOfBirth'] })}
                    {renderTextField('Marriage Date', 'marriageDate')}
                    {renderTextField('Wedding Date', 'weddingDate')}
                    {renderTextField('Widowed Date', 'widowedDate')}
                    {renderTextField('Marital Problems', 'maritalProblems', { multiline: true })}
                    {renderBoolField('Divorced', 'divorced')}
                    {renderTextField('Divorce Date', 'divorceDate')}
                    {renderTextField('Divorce Cause', 'divorceCause', { multiline: true })}
                    {renderBoolField('Remarried', 'remarried')}
                    {renderTextField('Remarried Date', 'remarriedDate')}
                    {renderBoolField('Legally Separated', 'legallySeparated')}
                    {renderTextField('Separation Details', 'separationDetails', { multiline: true })}
                    {renderTextField('Engagement Date', 'engagementDate')}
                  </div>
                </div>

                {/* Step 2: Pregnancy & Delivery History */}
                <div className="bg-pink-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-900 mb-4">🤰 Step 2: Pregnancy & Delivery History</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderTextField('Total Deliveries (20+ weeks)', 'totalDeliveries')}
                  </div>
                  {isEditingApplication ? (
                    <div className="mt-4">
                      {renderJsonField('Delivery History (JSON)', 'deliveries')}
                    </div>
                  ) : selectedApp.deliveries && selectedApp.deliveries.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500 mb-2">Delivery History</label>
                      <div className="space-y-3">
                        {selectedApp.deliveries.map((delivery: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <p className="text-sm font-medium text-gray-700">Delivery #{index + 1}</p>
                            <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                              <div><span className="text-gray-500">Year:</span> {delivery.year || 'N/A'}</div>
                              <div><span className="text-gray-500">Method:</span> {delivery.deliveryMethod || 'N/A'}</div>
                              <div><span className="text-gray-500">Weeks:</span> {delivery.gestationWeeks || 'N/A'}</div>
                              <div><span className="text-gray-500">Fetuses:</span> {delivery.fetusesCount || 'N/A'}</div>
                              <div><span className="text-gray-500">Conception:</span> {delivery.conceptionMethod || 'N/A'}</div>
                              <div><span className="text-gray-500">Result:</span> {delivery.pregnancyResult || 'N/A'}</div>
                              <div className="col-span-2"><span className="text-gray-500">Complications:</span> {delivery.complications || 'None'}</div>
                              {Array.isArray(delivery.babies) && delivery.babies.length > 0 ? (
                                delivery.babies.map((baby: any, babyIndex: number) => (
                                  <div key={babyIndex} className="col-span-4">
                                    <span className="text-gray-500">Baby #{babyIndex + 1}:</span>{' '}
                                    Gender {baby?.gender || 'N/A'}, Weight {baby?.birthWeight || 'N/A'}
                                  </div>
                                ))
                              ) : (
                                <>
                                  <div><span className="text-gray-500">Gender:</span> {delivery.gender || 'N/A'}</div>
                                  <div><span className="text-gray-500">Weight:</span> {delivery.birthWeight || 'N/A'}</div>
                                </>
                              )}
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
                    {renderBoolField('Health Insurance', 'healthInsurance')}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Maternity Coverage</label>
                      {isEditingApplication ? (
                        <select value={editFormData.maternityCoverage === true ? 'true' : editFormData.maternityCoverage === false ? 'false' : editFormData.maternityCoverage === 'not_sure' ? 'not_sure' : ''} onChange={(e) => { const v = e.target.value; updateEditField('maternityCoverage', v === '' ? null : v === 'true' ? true : v === 'false' ? false : v); }} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                          <option value="">N/A</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                          <option value="not_sure">Not Sure</option>
                        </select>
                      ) : (
                        <p className="text-sm text-gray-900">{selectedApp.maternityCoverage === true ? 'Yes' : selectedApp.maternityCoverage === 'not_sure' ? 'Not Sure' : selectedApp.maternityCoverage === false ? 'No' : 'N/A'}</p>
                      )}
                    </div>
                    {renderTextField('Insurance Details', 'insuranceDetails', { multiline: true })}
                    {renderBoolField('State Agency Insurance', 'stateAgencyInsurance')}
                    {renderTextField('State Agency Name', 'stateAgencyName')}
                    {renderTextField('Insurance Payment Method', 'insurancePaymentMethod')}
                    {renderTextField('Delivery Hospital', 'deliveryHospital')}
                    {renderBoolField('Delivered at Hospital Before', 'deliveredAtHospitalBefore')}
                    {renderBoolField('Abnormal Pap Smear', 'abnormalPapSmear')}
                    {renderBoolField('Monthly Cycles', 'monthlyCycles')}
                    {renderTextField('Cycle Days', 'cycleDays')}
                    {renderTextField('Period Days', 'periodDays')}
                    {renderTextField('Last Menstrual Period', 'lastMenstrualPeriod')}
                    {renderBoolField('Infertility Doctor', 'infertilityDoctor')}
                    {renderTextField('Infertility Details', 'infertilityDetails', { multiline: true })}
                    {renderBoolField('Household Marijuana Use', 'householdMarijuana')}
                    {renderBoolField('Pregnancy Problems', 'pregnancyProblems')}
                    {renderTextField('Pregnancy Problems Details', 'pregnancyProblemsDetails', { multiline: true })}
                    {renderBoolField('Children Health Problems', 'childrenHealthProblems')}
                    {renderTextField('Children Health Details', 'childrenHealthDetails', { multiline: true })}
                    {renderBoolField('Currently Breastfeeding', 'breastfeeding')}
                    {renderTextField('Breastfeeding Stop Date', 'breastfeedingStopDate')}
                    {renderBoolField('Tattoos/Piercings (Last 1.5 years)', 'tattoosPiercings')}
                    {renderTextField('Tattoos/Piercings Date', 'tattoosPiercingsDate')}
                    {renderBoolField('Depression Medication', 'depressionMedication')}
                    {renderTextField('Depression Medication Details', 'depressionMedicationDetails', { multiline: true })}
                    {renderBoolField('Drug/Alcohol Abuse', 'drugAlcoholAbuse')}
                    {renderBoolField('Excess Heat Exposure', 'excessHeat')}
                    {renderBoolField('Alcohol Limit Advised', 'alcoholLimitAdvised')}
                    {renderTextField('Smoking Status', 'smokingStatus')}
                    {renderBoolField('Smoked During Pregnancy', 'smokedDuringPregnancy')}
                    {renderTextField('Alcohol Usage', 'alcoholUsage')}
                    {renderBoolField('Illegal Drugs', 'illegalDrugs')}
                    {renderBoolField('Mental Health Treatment', 'mentalHealthTreatment')}
                    {renderBoolField('Postpartum Depression', 'postpartumDepression')}
                    {renderBoolField('Hepatitis B Vaccinated', 'hepatitisBVaccinated')}
                    {renderBoolField('Allergies', 'allergies')}
                    {renderTextField('Allergies Details', 'allergiesDetails', { multiline: true })}
                    {renderTextField('Current Medications', 'currentMedications', { multiline: true })}
                    {renderTextField('Children List', 'childrenList', { multiline: true })}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Surgeries</label>
                      {isEditingApplication ? (
                        <div className="grid grid-cols-1 gap-1 mt-1">
                          <select value={editFormData.surgeries === true ? 'true' : editFormData.surgeries === false ? 'false' : ''} onChange={(e) => { const v = e.target.value; updateEditField('surgeries', v === '' ? null : v === 'true'); }} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white">
                            <option value="">N/A</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                          <input type="text" placeholder="Surgery details" value={editFormData.surgeryDetails ?? ''} onChange={(e) => updateEditField('surgeryDetails', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApp.surgeries === true ? selectedApp.surgeryDetails || 'Yes' : 'No'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 4: Sexual History */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-purple-900 mb-4">💕 Step 4: Sexual History</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {renderTextField('Past Contraceptives', 'pastContraceptives', { multiline: true })}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Birth Control</label>
                      {isEditingApplication ? (
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <select value={editFormData.currentBirthControl === true ? 'true' : editFormData.currentBirthControl === false ? 'false' : ''} onChange={(e) => { const v = e.target.value; updateEditField('currentBirthControl', v === '' ? null : v === 'true'); }} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white">
                            <option value="">N/A</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                          <input type="text" placeholder="Method" value={editFormData.birthControlMethod ?? ''} onChange={(e) => updateEditField('birthControlMethod', e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white" />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900">{selectedApp.currentBirthControl === true ? `Yes (${selectedApp.birthControlMethod || 'N/A'})` : selectedApp.currentBirthControl === false ? 'No' : 'N/A'}</p>
                      )}
                    </div>
                    {renderTextField('Birth Control Duration', 'birthControlDuration')}
                    {renderBoolField('Sexual Partner', 'sexualPartner')}
                    {renderBoolField('Multiple Partners', 'multiplePartners')}
                    {renderTextField('Partners (Last 3 Years)', 'partnersLastThreeYears')}
                    {renderBoolField('High Risk HIV Contact', 'highRiskHIVContact')}
                    {renderBoolField('HIV Risk', 'hivRisk')}
                    {renderBoolField('Blood Transfusion', 'bloodTransfusion')}
                    {renderBoolField('STD History', 'stdHistory')}
                    {renderTextField('STD Details', 'stdDetails', { multiline: true })}
                  </div>
                </div>

                {/* Step 5: Employment Information */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-yellow-900 mb-4">💼 Step 5: Employment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderTextField('Current Employment', 'currentEmployment', { multiline: true })}
                    {renderTextField('Monthly Income', 'monthlyIncome')}
                    {renderTextField('Spouse Employment', 'spouseEmployment', { multiline: true })}
                    {renderTextField('Spouse Monthly Income', 'spouseMonthlyIncome')}
                    {renderTextField('Persons Supported', 'personsSupported')}
                    {renderBoolField('Public Assistance', 'publicAssistance')}
                  </div>
                  <div className="mt-4">
                    {renderTextField('Household Members', 'householdMembers', { multiline: true })}
                  </div>
                </div>

                {/* Step 6: Education */}
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-indigo-900 mb-4">🎓 Step 6: Education</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderTextField('Education Level', 'educationLevel')}
                    {renderTextField('Trade School Details', 'tradeSchoolDetails')}
                  </div>
                </div>

                {/* Step 7: General Questions & Preferences */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-orange-900 mb-4">💭 Step 7: General Questions & Preferences</h3>
                  <div className="space-y-4">
                    {renderTextField('Surrogacy Understanding & Motivation', 'surrogacyUnderstanding', { multiline: true })}
                    {renderTextField('Self Introduction', 'selfIntroduction', { multiline: true })}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Main Concerns</label>
                      {isEditingApplication ? (
                        <input
                          type="text"
                          value={editFormData.mainConcerns == null ? '' : Array.isArray(editFormData.mainConcerns) ? editFormData.mainConcerns.join(', ') : String(editFormData.mainConcerns)}
                          onChange={(e) => updateEditField('mainConcerns', e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{Array.isArray(selectedApp.mainConcerns) ? selectedApp.mainConcerns.join(', ') : selectedApp.mainConcerns || 'N/A'}</p>
                      )}
                    </div>
                    {renderTextField('Parent Qualities', 'parentQualities', { multiline: true })}
                    {renderTextField('Expected Support', 'expectedSupport', { multiline: true })}
                    {renderTextField('Partner Feelings About Surrogacy', 'partnerFeelings', { multiline: true })}
                    {renderTextField('Contact During Process', 'contactDuringProcess')}
                    {renderTextField('Contact After Birth', 'contactAfterBirth')}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {renderBoolField('Religious Preference', 'religiousPreference')}
                    {renderBoolField('Unmarried Couple', 'unmarriedCouple')}
                    {renderBoolField('Heterosexual Couple', 'heterosexualCouple')}
                    {renderBoolField('Same Sex Couple', 'sameSexCouple')}
                    {renderBoolField('Single Male', 'singleMale')}
                    {renderBoolField('Single Female', 'singleFemale')}
                    {renderBoolField('Egg Donor', 'eggDonor')}
                    {renderBoolField('Sperm Donor', 'spermDonor')}
                    {renderBoolField('Older Couple', 'olderCouple')}
                    {renderBoolField('Couple with Children', 'coupleWithChildren')}
                    {renderBoolField('International', 'internationalCouple')}
                    {renderBoolField('Non-English Speaking', 'nonEnglishSpeaking')}
                    {renderBoolField('Carry Twins', 'carryTwins')}
                    {renderBoolField('Reduce Multiples', 'reduceMultiples')}
                    {renderBoolField('Amniocentesis', 'amniocentesis')}
                    {renderBoolField('Abort for Birth Defects', 'abortBirthDefects')}
                    {renderBoolField('Concerns Placing Baby', 'concernsPlacingBaby')}
                    {renderBoolField('Parents in Delivery', 'parentsInDeliveryRoom')}
                    {renderBoolField('Parents at Appointments', 'parentsAtAppointments')}
                    {renderBoolField('Hospital Notification', 'hospitalNotification')}
                    {renderBoolField('Parents on Birth Certificate', 'parentsOnBirthCertificate')}
                    {renderBoolField('Applying Elsewhere', 'applyingElsewhere')}
                    {renderBoolField('Previously Rejected', 'previouslyRejected')}
                    {renderBoolField('Attend Checkups', 'attendPrenatalCheckups')}
                    {renderBoolField('Medical Examinations', 'medicalExaminations')}
                    {renderBoolField('Lifestyle Guidelines', 'lifestyleGuidelines')}
                    {renderBoolField('Avoid Long Travel', 'avoidLongTravel')}
                    {renderBoolField('Refrain High-risk Work', 'refrainHighRiskWork')}
                    {renderBoolField('Placed Child for Adoption', 'placedForAdoption')}
                    {renderBoolField('Non-supportive People', 'nonSupportivePeople')}
                    {renderBoolField('Child Care Support', 'childCareSupport')}
                  </div>
                </div>

                {/* Step 8: Authorization */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-900 mb-4">✍️ Step 8: Authorization</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderBoolField('Authorization Agreed', 'authorizationAgreed')}
                    {renderTextField('Applicant Address', 'applicantAddress', { multiline: true })}
                    {renderTextField('Emergency Contact', 'emergencyContact', { multiline: true })}
                  </div>
                </div>

                {/* Application Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">📋 Application Status</h3>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full 
                      ${selectedApp.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        selectedApp.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        selectedApp.status === 'registered' ? 'bg-indigo-100 text-indigo-800' :
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
                  {isEditingApplication ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingApplication(false);
                          setEditFormData({});
                          setEditJsonDrafts({});
                          setEditingApp(null);
                        }}
                        disabled={savingEdit}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                      >
                        {savingEdit ? 'Saving...' : '💾 Save All'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setSelectedApp(null); setIsEditingApplication(false); }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Close
                      </button>
                      {isActionableApplication(selectedApp) && (
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
                      )}
                      {canEditApplications && isActionableApplication(selectedApp) && (
                        <button
                          onClick={() => openEditApplication(selectedApp)}
                          className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {selectedApp.applicationType === 'surrogate' ? (
                        <ApproveButton 
                          id={selectedApp.id} 
                          currentStatus={selectedApp.status} 
                          onUpdate={() => {
                            loadApplications();
                            setSelectedApp(null);
                          }}
                        />
                      ) : selectedApp.applicationType === 'intended_parent' ? (
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
                      ) : (
                        <span className="px-4 py-2 text-sm text-gray-500">Sign Up user (no approval action)</span>
                      )}
                    </>
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
