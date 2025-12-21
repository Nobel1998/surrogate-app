'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Profile = {
  id: string;
  name?: string;
  // profiles 表无 email 字段，保持可选仅为兼容未来扩展
  email?: string;
  phone?: string;
  role?: string;
  progress_stage?: string | null;
  stage_updated_by?: string | null;
  branch_id?: string | null;
  transfer_date?: string | null;
  transfer_embryo_day?: string | null;
};

type Branch = {
  id: string;
  name: string;
  code: string;
};

type Match = {
  id: string;
  surrogate_id: string;
  parent_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
  // Case fields (merged from cases table)
  claim_id?: string | null;
  case_type?: string | null;
  first_parent_id?: string | null;
  first_parent_name?: string | null;
  second_parent_id?: string | null;
  second_parent_name?: string | null;
  manager_id?: string | null;
  branch_id?: string | null;
  current_step?: string | null;
  weeks_pregnant?: number;
  estimated_due_date?: string | null;
  number_of_fetuses?: number;
  fetal_beat_confirm?: string | null;
  sign_date?: string | null;
  transfer_date?: string | null;
  beta_confirm_date?: string | null;
  due_date?: string | null;
  clinic?: string | null;
  embryos?: string | null;
  lawyer?: string | null;
  company?: string | null;
  files?: any;
  managers?: Array<{ id: string; name: string; role?: string }>;
  manager_ids?: string[];
  manager_name?: string | null;
};

type Post = {
  id: string;
  user_id: string;
  content?: string | null;
  text?: string | null;
  media_url?: string | null;
  media_uri?: string | null;
  media_type?: string | null;
  stage?: string | null;
  created_at?: string | null;
};
type CommentRow = { id: string; post_id: string };
type LikeRow = { id: string; post_id: string };
type MedicalReport = {
  id: string;
  user_id: string;
  visit_date: string;
  provider_name?: string | null;
  stage: string;
  report_data: any;
  proof_image_url?: string | null;
  created_at: string;
};

type Contract = {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name?: string | null;
  created_at?: string | null;
};

const STATUS_OPTIONS = ['active', 'completed', 'cancelled', 'pending'];
const STAGE_OPTIONS = ['pre', 'pregnancy', 'ob_visit', 'delivery'];
const STAGE_LABELS: Record<string, string> = {
  'pre': 'Pre-Transfer',
  'pregnancy': 'Post-Transfer',
  'ob_visit': 'OB Office Visit',
  'delivery': 'Delivery',
};

type Case = {
  id: string;
  claim_id: string;
  surrogate_id?: string | null;
  first_parent_id?: string | null;
  first_parent_name?: string | null;
  second_parent_id?: string | null;
  second_parent_name?: string | null;
  case_type: string;
  manager_id?: string | null;
  branch_id?: string | null;
  current_step?: string | null;
  weeks_pregnant: number;
  estimated_due_date?: string | null;
  number_of_fetuses: number;
  fetal_beat_confirm: string;
  sign_date?: string | null;
  transfer_date?: string | null;
  beta_confirm_date?: string | null;
  due_date?: string | null;
  clinic?: string | null;
  embryos?: string | null;
  lawyer?: string | null;
  company?: string | null;
  files?: any;
  status: string;
  created_at: string;
  updated_at: string;
  surrogate_name?: string | null;
  manager_name?: string | null;
  managers?: Array<{ id: string; name: string; role?: string }>;
  manager_ids?: string[];
};

export default function MatchesPage() {
  const [surrogates, setSurrogates] = useState<Profile[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [postLikes, setPostLikes] = useState<LikeRow[]>([]);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSurrogate, setSelectedSurrogate] = useState<string>('');
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [status, setStatus] = useState<string>('active');
  const [stage, setStage] = useState<string>('pre');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  
  // Branch management state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [adminUserId, setAdminUserId] = useState<string>('');
  const [canViewAllBranches, setCanViewAllBranches] = useState(true);
  const [currentBranchFilter, setCurrentBranchFilter] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [assigningManager, setAssigningManager] = useState<string | null>(null);
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [editingParent2, setEditingParent2] = useState<string | null>(null);
  const [parent2Name, setParent2Name] = useState<string>('');
  const [editingFetuses, setEditingFetuses] = useState<string | null>(null);
  const [fetusesValue, setFetusesValue] = useState<string>('');
  const [editingFetalBeat, setEditingFetalBeat] = useState<string | null>(null);
  const [fetalBeatValue, setFetalBeatValue] = useState<string>('');
  
  // Contract upload state
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractMatchId, setContractMatchId] = useState<string | null>(null);
  const [contractSurrogateId, setContractSurrogateId] = useState<string>('');
  const [contractParentId, setContractParentId] = useState<string>('');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  
  // Attorney Retainer Agreement upload state
  const [showAttorneyModal, setShowAttorneyModal] = useState(false);
  const [attorneyMatchId, setAttorneyMatchId] = useState<string | null>(null);
  const [attorneySurrogateId, setAttorneySurrogateId] = useState<string>('');
  const [attorneyParentId, setAttorneyParentId] = useState<string>('');
  const [attorneyFile, setAttorneyFile] = useState<File | null>(null);
  const [uploadingAttorney, setUploadingAttorney] = useState(false);
  
  // Life Insurance Policy upload state
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [insuranceMatchId, setInsuranceMatchId] = useState<string | null>(null);
  const [insuranceSurrogateId, setInsuranceSurrogateId] = useState<string>('');
  const [insuranceParentId, setInsuranceParentId] = useState<string>('');
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  
  // Health Insurance Bill upload state
  const [showHealthInsuranceModal, setShowHealthInsuranceModal] = useState(false);
  const [healthInsuranceMatchId, setHealthInsuranceMatchId] = useState<string | null>(null);
  const [healthInsuranceSurrogateId, setHealthInsuranceSurrogateId] = useState<string>('');
  const [healthInsuranceParentId, setHealthInsuranceParentId] = useState<string>('');
  const [healthInsuranceFile, setHealthInsuranceFile] = useState<File | null>(null);
  const [uploadingHealthInsurance, setUploadingHealthInsurance] = useState(false);
  
  // PBO upload state
  const [showPBOModal, setShowPBOModal] = useState(false);
  const [pboMatchId, setPBOMatchId] = useState<string | null>(null);
  const [pboSurrogateId, setPBOSurrogateId] = useState<string>('');
  const [pboParentId, setPBOParentId] = useState<string>('');
  const [pboFile, setPBOFile] = useState<File | null>(null);
  const [uploadingPBO, setUploadingPBO] = useState(false);
  
  // Online Claims upload state
  const [showClaimsModal, setShowClaimsModal] = useState(false);
  const [claimsMatchId, setClaimsMatchId] = useState<string | null>(null);
  const [claimsSurrogateId, setClaimsSurrogateId] = useState<string>('');
  const [claimsParentId, setClaimsParentId] = useState<string>('');
  const [claimsFile, setClaimsFile] = useState<File | null>(null);
  const [uploadingClaims, setUploadingClaims] = useState(false);
  
  // Agency Retainer Agreement upload state
  const [showAgencyRetainerModal, setShowAgencyRetainerModal] = useState(false);
  const [agencyRetainerUserId, setAgencyRetainerUserId] = useState<string>('');
  const [agencyRetainerFile, setAgencyRetainerFile] = useState<File | null>(null);
  const [uploadingAgencyRetainer, setUploadingAgencyRetainer] = useState(false);
  
  // HIPAA Release upload state
  const [showHipaaReleaseModal, setShowHipaaReleaseModal] = useState(false);
  const [hipaaReleaseUserId, setHipaaReleaseUserId] = useState<string>('');
  const [hipaaReleaseFile, setHipaaReleaseFile] = useState<File | null>(null);
  const [uploadingHipaaRelease, setUploadingHipaaRelease] = useState(false);
  
  // Photo Release upload state
  const [showPhotoReleaseModal, setShowPhotoReleaseModal] = useState(false);
  const [photoReleaseUserId, setPhotoReleaseUserId] = useState<string>('');
  const [photoReleaseFile, setPhotoReleaseFile] = useState<File | null>(null);
  const [uploadingPhotoRelease, setUploadingPhotoRelease] = useState(false);

  const profileLookup = useMemo(() => {
    const map: Record<string, Profile> = {};
    [...surrogates, ...parents].forEach((p) => {
      if (p.id) map[p.id] = p;
    });
    return map;
  }, [surrogates, parents]);

  // Load admin user info on mount
  useEffect(() => {
    const loadAdminInfo = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const adminInfo = await res.json();
          console.log('🔍 Admin Info:', adminInfo);
          setAdminUserId(adminInfo.id);
          const canView = adminInfo.canViewAllBranches || false;
          console.log('🔍 canViewAllBranches:', canView, 'role:', adminInfo.role);
          setCanViewAllBranches(canView);
          if (adminInfo.branch_id) {
            setCurrentBranchFilter(adminInfo.branch_id);
            setSelectedBranchFilter(adminInfo.branch_id);
          }
        } else {
          // Not authenticated, redirect to login
          window.location.href = '/login';
        }
      } catch (err) {
        console.error('Error loading admin info:', err);
        window.location.href = '/login';
      }
    };
    loadAdminInfo();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build URL with branch filter if available
      let url = '/api/matches/options';
      const params = new URLSearchParams();
      if (canViewAllBranches && selectedBranchFilter && selectedBranchFilter !== 'all') {
        params.append('branch_id', selectedBranchFilter);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Options request failed: ${res.status} ${errText || ''}`.trim());
      }
      const data = await res.json();
      const {
        profiles = [],
        matches: matchData = [],
        posts: postsData = [],
        comments: commentsData = [],
        postLikes: likesData = [],
        medicalReports: reportsData = [],
        contracts: contractsData = [],
        branches: branchesData = [],
        currentBranchFilter: branchFilter,
        canViewAllBranches: canViewAll,
      } = data;
      
      // Debug: Log matches with managers
      console.log('[matches] Loaded matches data:', {
        totalMatches: matchData.length,
        matchesWithManagers: matchData.filter((m: any) => m.managers && m.managers.length > 0).map((m: any) => ({
          id: m.id,
          managersCount: m.managers.length,
          managers: m.managers.map((mg: any) => ({ id: mg.id, name: mg.name })),
          manager_ids: m.manager_ids || [],
          manager_idsCount: m.manager_ids?.length || 0,
        })),
        allMatchesWithManagerIds: matchData.map((m: any) => ({
          id: m.id,
          manager_ids: m.manager_ids || [],
          manager_idsCount: m.manager_ids?.length || 0,
          managers: m.managers || [],
          managersCount: m.managers?.length || 0,
        })),
      });

      const surList = profiles.filter((p: Profile) => (p.role || '').toLowerCase() === 'surrogate');
      const parList = profiles.filter((p: Profile) => (p.role || '').toLowerCase() === 'parent');

      console.log('🧭 Matches loadData result', {
        allProfiles: profiles.length,
        surrogates: surList.length,
        parents: parList.length,
        matches: matchData?.length || 0,
        firstProfile: profiles?.[0],
        firstMatch: matchData?.[0],
      });

      setSurrogates(surList);
      setParents(parList);
      setMatches(matchData || []);
      setPosts(postsData || []);
      setComments(commentsData || []);
      setPostLikes(likesData || []);
      setMedicalReports(reportsData || []);
      setContracts(contractsData || []);
      setBranches(branchesData || []);
      setCurrentBranchFilter(branchFilter || null);
      setCanViewAllBranches(canViewAll !== false);
      
      // default stage selection for form: if surrogate chosen, pick its stage
      if (selectedSurrogate) {
        const found = surList.find((s: Profile) => s.id === selectedSurrogate);
        if (found?.progress_stage) setStage(found.progress_stage);
      }
    } catch (err: any) {
      console.error('Error loading matches data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load data when component mounts or when admin info is available
    if (adminUserId) {
      loadData();
      loadAdminUsers();
    }
  }, [adminUserId]);

  const loadAdminUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error loading admin users:', err);
    }
  };

  const handleUpdateParent2 = async (matchId: string) => {
    try {
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          second_parent_name: parent2Name.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Parent 2 name');
      }

      // Reload matches data to get updated parent name
      await loadData();
      setEditingParent2(null);
      setParent2Name('');
      alert('Parent 2 name updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Parent 2 name:', err);
      alert(err.message || 'Failed to update Parent 2 name');
    }
  };

  const handleUpdateFetuses = async (matchId: string) => {
    try {
      const numValue = fetusesValue.trim() ? parseInt(fetusesValue.trim(), 10) : null;
      if (fetusesValue.trim() && (isNaN(numValue!) || numValue! < 0)) {
        alert('Please enter a valid number for fetuses');
        return;
      }

      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number_of_fetuses: numValue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update number of fetuses');
      }

      await loadData();
      setEditingFetuses(null);
      setFetusesValue('');
      alert('Number of fetuses updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating number of fetuses:', err);
      alert(err.message || 'Failed to update number of fetuses');
    }
  };

  const handleUpdateFetalBeat = async (matchId: string) => {
    try {
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fetal_beat_confirm: fetalBeatValue.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Fetal Beat Confirm');
      }

      await loadData();
      setEditingFetalBeat(null);
      setFetalBeatValue('');
      alert('Fetal Beat Confirm updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Fetal Beat Confirm:', err);
      alert(err.message || 'Failed to update Fetal Beat Confirm');
    }
  };

  const assignManagersToCase = async (matchId: string, managerIds: string[]) => {
    try {
      console.log('[matches] Assigning managers:', {
        matchId,
        managerIds,
        managerIdsCount: managerIds.length,
        managerIdsArray: managerIds,
      });
      
      // Validate that we have manager IDs
      if (!managerIds || managerIds.length === 0) {
        alert('Please select at least one manager');
        return;
      }
      
      const res = await fetch(`/api/cases/${matchId}/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_ids: managerIds,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to assign managers');
      }

      const result = await res.json();
      console.log('[matches] Assignment result:', {
        success: result.success,
        managersCount: result.managers?.length || 0,
        managers: result.managers?.map((m: any) => ({ id: m.manager_id, name: m.manager?.name })) || [],
        rawManagers: result.managers,
      });

      // Reload matches data to get updated manager assignments
      console.log('[matches] Reloading data after assignment...');
      await loadData();
      console.log('[matches] Data reloaded');
      
      setAssigningManager(null);
      setSelectedManagerIds([]);
      alert(`Successfully assigned ${managerIds.length} manager(s)`);
    } catch (err: any) {
      console.error('[matches] Error assigning managers:', err);
      alert(err.message || 'Failed to assign managers');
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Handle branch filter change (only for admins)
  const handleBranchFilterChange = async (branchId: string) => {
    setSelectedBranchFilter(branchId);
    // Reload data with branch filter
    await loadData();
  };

  const createMatch = async () => {
    if (!selectedSurrogate || !selectedParent) {
      alert('Please select both a surrogate and a parent.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/matches/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surrogate_id: selectedSurrogate,
          parent_id: selectedParent,
          status,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Create match failed: ${res.status} ${errText}`);
      }
      await loadData();
      setNotes('');
      alert('Match saved successfully');
    } catch (err: any) {
      console.error('Error creating match:', err);
      alert(err.message || 'Failed to create match');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStage = async (surrogateId: string, newStage: string) => {
    try {
      const res = await fetch('/api/matches/options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surrogate_id: surrogateId, progress_stage: newStage, stage_updated_by: 'admin' }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Update stage failed: ${res.status} ${errText}`);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error updating stage:', err);
      alert(err.message || 'Failed to update stage');
    }
  };

  const updateMatchStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/matches/options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Update status failed: ${res.status} ${errText}`);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update status');
    }
  };

  const openContractModal = (match: Match) => {
    setContractMatchId(match.id);
    setContractSurrogateId(match.surrogate_id);
    setContractParentId(match.parent_id);
    setContractFile(null);
    setShowContractModal(true);
  };

  const uploadContract = async () => {
    if (!contractFile) {
      alert('Please select a contract file');
      return;
    }
    if (!contractSurrogateId || !contractParentId) {
      alert('Surrogate and Parent IDs are required');
      return;
    }

    setUploadingContract(true);
    try {
      const formData = new FormData();
      formData.append('file', contractFile);
      formData.append('surrogate_id', contractSurrogateId);
      formData.append('parent_id', contractParentId);
      formData.append('contract_type', 'both');

      const res = await fetch('/api/matches/contracts', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Contract uploaded successfully! Both users can now see it in their My Match section.');
      setShowContractModal(false);
      setContractFile(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading contract:', err);
      alert(err.message || 'Failed to upload contract');
    } finally {
      setUploadingContract(false);
    }
  };

  const deleteContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/matches/contracts?id=${contractId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Delete failed: ${res.status} ${errText}`);
      }

      alert('Contract deleted successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Error deleting contract:', err);
      alert(err.message || 'Failed to delete contract');
    }
  };

  const deleteMedicalReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this medical check-in? This action cannot be undone and will also remove associated points rewards.')) {
      return;
    }

    try {
      const res = await fetch(`/api/matches/medical-reports?id=${reportId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Delete failed: ${res.status} ${errText}`);
      }

      alert('Medical check-in deleted successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Error deleting medical report:', err);
      alert(err.message || 'Failed to delete medical check-in');
    }
  };

  const openAttorneyModal = (match: Match) => {
    setAttorneyMatchId(match.id);
    setAttorneySurrogateId(match.surrogate_id);
    setAttorneyParentId(match.parent_id);
    setAttorneyFile(null);
    setShowAttorneyModal(true);
  };

  const uploadAttorneyRetainer = async () => {
    if (!attorneyFile) {
      alert('Please select a file');
      return;
    }
    if (!attorneySurrogateId || !attorneyParentId) {
      alert('Surrogate and Parent IDs are required');
      return;
    }

    setUploadingAttorney(true);
    try {
      const formData = new FormData();
      formData.append('file', attorneyFile);
      formData.append('surrogate_id', attorneySurrogateId);
      formData.append('parent_id', attorneyParentId);

      const res = await fetch('/api/matches/attorney-retainer', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Attorney Retainer Agreement uploaded successfully! Both users can now see it in their My Match section.');
      setShowAttorneyModal(false);
      setAttorneyFile(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading attorney retainer:', err);
      alert(err.message || 'Failed to upload attorney retainer agreement');
    } finally {
      setUploadingAttorney(false);
    }
  };

  const openInsuranceModal = (match: Match) => {
    setInsuranceMatchId(match.id);
    setInsuranceSurrogateId(match.surrogate_id);
    setInsuranceParentId(match.parent_id);
    setInsuranceFile(null);
    setShowInsuranceModal(true);
  };

  const uploadLifeInsurance = async () => {
    if (!insuranceFile) {
      alert('Please select a file');
      return;
    }
    if (!insuranceSurrogateId || !insuranceParentId) {
      alert('Surrogate and Parent IDs are required');
      return;
    }

    setUploadingInsurance(true);
    try {
      const formData = new FormData();
      formData.append('file', insuranceFile);
      formData.append('surrogate_id', insuranceSurrogateId);
      formData.append('parent_id', insuranceParentId);

      const res = await fetch('/api/matches/life-insurance', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Surrogate Life Insurance Policy uploaded successfully! Both users can now see it in their My Match section.');
      setShowInsuranceModal(false);
      setInsuranceFile(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading life insurance:', err);
      alert(err.message || 'Failed to upload life insurance policy');
    } finally {
      setUploadingInsurance(false);
    }
  };

  const openHealthInsuranceModal = (match: Match) => {
    setHealthInsuranceMatchId(match.id);
    setHealthInsuranceSurrogateId(match.surrogate_id);
    setHealthInsuranceParentId(match.parent_id);
    setHealthInsuranceFile(null);
    setShowHealthInsuranceModal(true);
  };

  const uploadHealthInsurance = async () => {
    if (!healthInsuranceFile) {
      alert('Please select a file');
      return;
    }
    if (!healthInsuranceSurrogateId || !healthInsuranceParentId) {
      alert('Surrogate and Parent IDs are required');
      return;
    }

    setUploadingHealthInsurance(true);
    try {
      const formData = new FormData();
      formData.append('file', healthInsuranceFile);
      formData.append('surrogate_id', healthInsuranceSurrogateId);
      formData.append('parent_id', healthInsuranceParentId);

      const res = await fetch('/api/matches/health-insurance', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Surrogate Health Insurance Bill uploaded successfully! Both users can now see it in their My Match section.');
      setShowHealthInsuranceModal(false);
      setHealthInsuranceFile(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading health insurance:', err);
      alert(err.message || 'Failed to upload health insurance bill');
    } finally {
      setUploadingHealthInsurance(false);
    }
  };

  const openPBOModal = (match: Match) => {
    setPBOMatchId(match.id);
    setPBOSurrogateId(match.surrogate_id);
    setPBOParentId(match.parent_id);
    setPBOFile(null);
    setShowPBOModal(true);
  };

  const uploadPBO = async () => {
    if (!pboFile) {
      alert('Please select a file');
      return;
    }
    if (!pboSurrogateId || !pboParentId) {
      alert('Surrogate and Parent IDs are required');
      return;
    }

    setUploadingPBO(true);
    try {
      const formData = new FormData();
      formData.append('file', pboFile);
      formData.append('surrogate_id', pboSurrogateId);
      formData.append('parent_id', pboParentId);

      const res = await fetch('/api/matches/pbo', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('PBO document uploaded successfully! Both users can now see it in their My Match section.');
      setShowPBOModal(false);
      setPBOFile(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading PBO:', err);
      alert(err.message || 'Failed to upload PBO document');
    } finally {
      setUploadingPBO(false);
    }
  };

  const openClaimsModal = (match: Match) => {
    setClaimsMatchId(match.id);
    setClaimsSurrogateId(match.surrogate_id);
    setClaimsParentId(match.parent_id);
    setClaimsFile(null);
    setShowClaimsModal(true);
  };

  const uploadOnlineClaims = async () => {
    if (!claimsFile) {
      alert('Please select a file');
      return;
    }
    if (!claimsSurrogateId || !claimsParentId) {
      alert('Surrogate and Parent IDs are required');
      return;
    }

    setUploadingClaims(true);
    try {
      const formData = new FormData();
      formData.append('file', claimsFile);
      formData.append('surrogate_id', claimsSurrogateId);
      formData.append('parent_id', claimsParentId);

      const res = await fetch('/api/matches/online-claims', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Online Claims document uploaded successfully! Both users can now see it in their My Match section.');
      setShowClaimsModal(false);
      setClaimsFile(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading online claims:', err);
      alert(err.message || 'Failed to upload online claims document');
    } finally {
      setUploadingClaims(false);
    }
  };

  const openAgencyRetainerModal = () => {
    setAgencyRetainerUserId('');
    setAgencyRetainerFile(null);
    setShowAgencyRetainerModal(true);
  };

  const uploadAgencyRetainer = async () => {
    if (!agencyRetainerFile) {
      alert('Please select a file');
      return;
    }
    if (!agencyRetainerUserId) {
      alert('Please select a user');
      return;
    }

    setUploadingAgencyRetainer(true);
    try {
      const formData = new FormData();
      formData.append('file', agencyRetainerFile);
      formData.append('user_id', agencyRetainerUserId);

      const res = await fetch('/api/matches/agency-retainer', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Agency Retainer Agreement uploaded successfully! The user can now see it in their User Center.');
      setShowAgencyRetainerModal(false);
      setAgencyRetainerFile(null);
      setAgencyRetainerUserId('');
      await loadData();
    } catch (err: any) {
      console.error('Error uploading agency retainer:', err);
      alert(err.message || 'Failed to upload agency retainer agreement');
    } finally {
      setUploadingAgencyRetainer(false);
    }
  };

  const openHipaaReleaseModal = () => {
    setHipaaReleaseUserId('');
    setHipaaReleaseFile(null);
    setShowHipaaReleaseModal(true);
  };

  const uploadHipaaRelease = async () => {
    if (!hipaaReleaseFile) {
      alert('Please select a file');
      return;
    }
    if (!hipaaReleaseUserId) {
      alert('Please select a user');
      return;
    }

    setUploadingHipaaRelease(true);
    try {
      const formData = new FormData();
      formData.append('file', hipaaReleaseFile);
      formData.append('user_id', hipaaReleaseUserId);

      const res = await fetch('/api/matches/hipaa-release', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('HIPAA Release uploaded successfully! The user can now see it in their User Center.');
      setShowHipaaReleaseModal(false);
      setHipaaReleaseFile(null);
      setHipaaReleaseUserId('');
      await loadData();
    } catch (err: any) {
      console.error('Error uploading HIPAA release:', err);
      alert(err.message || 'Failed to upload HIPAA release');
    } finally {
      setUploadingHipaaRelease(false);
    }
  };

  const openPhotoReleaseModal = () => {
    setPhotoReleaseUserId('');
    setPhotoReleaseFile(null);
    setShowPhotoReleaseModal(true);
  };

  const uploadPhotoRelease = async () => {
    if (!photoReleaseFile) {
      alert('Please select a file');
      return;
    }
    if (!photoReleaseUserId) {
      alert('Please select a user');
      return;
    }

    setUploadingPhotoRelease(true);
    try {
      const formData = new FormData();
      formData.append('file', photoReleaseFile);
      formData.append('user_id', photoReleaseUserId);

      const res = await fetch('/api/matches/photo-release', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Photo Release uploaded successfully! The user can now see it in their User Center.');
      setShowPhotoReleaseModal(false);
      setPhotoReleaseFile(null);
      setPhotoReleaseUserId('');
      await loadData();
    } catch (err: any) {
      console.error('Error uploading photo release:', err);
      alert(err.message || 'Failed to upload photo release');
    } finally {
      setUploadingPhotoRelease(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading matches...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Matches</h1>
              <p className="text-gray-600">Pair parents with surrogates, manage matches, and track internal cases.</p>
            </div>
            {canViewAllBranches && branches.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Filter by Branch:</label>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => handleBranchFilterChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!canViewAllBranches && currentBranchFilter && (
              <div className="text-sm text-gray-600">
                Viewing: {branches.find(b => b.id === currentBranchFilter)?.name || 'Your Branch'}
              </div>
            )}
          </div>
        </div>

        {/* Document Upload Section */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Upload</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => openAgencyRetainerModal()}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded transition-colors"
            >
              📄 Upload Agency Retainer Agreement
            </button>
            <button
              onClick={() => openHipaaReleaseModal()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
            >
              🔒 Upload HIPAA Release
            </button>
            <button
              onClick={() => openPhotoReleaseModal()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors"
            >
              📷 Upload Photo Release
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Upload documents for individual users. Each user will see their own document in User Center.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create / Update Match</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Surrogate</label>
              <select
                value={selectedSurrogate}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSurrogate(val);
                  const found = surrogates.find((s) => s.id === val);
                  setStage(found?.progress_stage || 'pre');
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a surrogate</option>
                {surrogates.map((s: Profile) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id} {s.phone ? `• ${s.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Parent</label>
              <select
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id} {p.phone ? `• ${p.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s: string) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Surrogate Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STAGE_OPTIONS.map((s: string) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this match"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={createMatch}
              disabled={submitting}
              className={`px-4 py-2 rounded-md text-white font-medium ${submitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
            >
              {submitting ? 'Saving...' : 'Save Match'}
            </button>
            <button
              onClick={() => {
                if (!selectedSurrogate) {
                  alert('Please select a surrogate to update stage.');
                  return;
                }
                updateStage(selectedSurrogate, stage);
              }}
              disabled={submitting || !selectedSurrogate}
              className={`ml-3 px-4 py-2 rounded-md text-blue-700 font-medium border ${submitting || !selectedSurrogate ? 'border-gray-300 text-gray-400' : 'border-blue-300 hover:border-blue-500'}`}
            >
              Update Stage
            </button>
          </div>
        </div>

        {/* Uploaded Files Section */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Uploaded Files</h2>
            <button
              onClick={loadData}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🔄 Refresh
            </button>
          </div>

          {contracts.length === 0 ? (
            <div className="text-sm text-gray-500">No contracts uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Group contracts by file_url and document_type to identify match-uploaded files
                    const contractGroups = new Map<string, Contract[]>();
                    const processedIds = new Set<string>();
                    
                    contracts.forEach((contract) => {
                      if (processedIds.has(contract.id)) return;
                      
                      // Check if this is a match-uploaded file (same file_url, same document_type, different user_id)
                      const matchTypes = ['parent_contract', 'surrogate_contract', 'legal_contract', 'insurance_policy', 'health_insurance_bill', 'parental_rights', 'online_claims'];
                      const isMatchType = matchTypes.includes(contract.document_type);
                      
                      if (isMatchType) {
                        // Find all contracts with same file_url and document_type
                        const relatedContracts = contracts.filter(
                          (c) => c.file_url === contract.file_url && 
                                 c.document_type === contract.document_type &&
                                 c.id !== contract.id
                        );
                        
                        if (relatedContracts.length > 0) {
                          // This is a match-uploaded file
                          const groupKey = `${contract.file_url}-${contract.document_type}`;
                          if (!contractGroups.has(groupKey)) {
                            contractGroups.set(groupKey, [contract, ...relatedContracts]);
                            processedIds.add(contract.id);
                            relatedContracts.forEach(c => processedIds.add(c.id));
                          }
                        } else {
                          // Single user file, but might be part of a match pair
                          // Check if there's a corresponding contract (e.g., parent_contract <-> surrogate_contract)
                          let correspondingType = '';
                          if (contract.document_type === 'parent_contract') {
                            correspondingType = 'surrogate_contract';
                          } else if (contract.document_type === 'surrogate_contract') {
                            correspondingType = 'parent_contract';
                          }
                          
                          if (correspondingType) {
                            const correspondingContract = contracts.find(
                              (c) => c.file_url === contract.file_url && 
                                     c.document_type === correspondingType
                            );
                            
                            if (correspondingContract) {
                              const groupKey = `${contract.file_url}-contract-pair`;
                              if (!contractGroups.has(groupKey)) {
                                contractGroups.set(groupKey, [contract, correspondingContract]);
                                processedIds.add(contract.id);
                                processedIds.add(correspondingContract.id);
                              }
                            }
                          }
                        }
                      }
                    });
                    
                    // Render grouped contracts (match-uploaded)
                    const renderedGroups: React.ReactElement[] = [];
                    contractGroups.forEach((groupContracts, groupKey) => {
                      const firstContract = groupContracts[0];
                      const user1 = profileLookup[firstContract.user_id];
                      const user2 = groupContracts.length > 1 ? profileLookup[groupContracts[1].user_id] : null;
                      
                      let contractTypeLabel = '';
                      if (firstContract.document_type === 'parent_contract' || firstContract.document_type === 'surrogate_contract') {
                        contractTypeLabel = 'Contract';
                      } else if (firstContract.document_type === 'legal_contract') {
                        contractTypeLabel = 'Attorney Retainer Agreement';
                      } else if (firstContract.document_type === 'insurance_policy') {
                        contractTypeLabel = 'Life Insurance Policy';
                      } else if (firstContract.document_type === 'health_insurance_bill') {
                        contractTypeLabel = 'Health Insurance Bill';
                      } else if (firstContract.document_type === 'parental_rights') {
                        contractTypeLabel = 'PBO';
                      } else if (firstContract.document_type === 'online_claims') {
                        contractTypeLabel = 'Online Claims';
                      } else {
                        contractTypeLabel = firstContract.document_type;
                      }
                      
                      renderedGroups.push(
                        <tr key={groupKey}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {firstContract.file_name || 'Unnamed file'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {contractTypeLabel}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div className="space-y-1">
                              <div>{user1?.name || user1?.phone || firstContract.user_id.substring(0, 8)}</div>
                              {user2 && (
                                <div className="text-xs text-gray-500">
                                  & {user2?.name || user2?.phone || groupContracts[1].user_id.substring(0, 8)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {firstContract.created_at ? new Date(firstContract.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-3">
                              <a
                                href={firstContract.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => {
                                  // Delete all related contracts
                                  groupContracts.forEach(c => deleteContract(c.id));
                                }}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                    
                    // Render single-user contracts (not match-uploaded)
                    const singleContracts = contracts.filter(c => !processedIds.has(c.id));
                    singleContracts.forEach((contract) => {
                      const user = profileLookup[contract.user_id];
                      let contractTypeLabel = '';
                      if (contract.document_type === 'parent_contract') {
                        contractTypeLabel = 'Parent Contract';
                      } else if (contract.document_type === 'surrogate_contract') {
                        contractTypeLabel = 'Surrogate Contract';
                      } else if (contract.document_type === 'legal_contract') {
                        contractTypeLabel = 'Attorney Retainer Agreement';
                      } else if (contract.document_type === 'insurance_policy') {
                        contractTypeLabel = 'Life Insurance Policy';
                      } else if (contract.document_type === 'health_insurance_bill') {
                        contractTypeLabel = 'Health Insurance Bill';
                      } else if (contract.document_type === 'parental_rights') {
                        contractTypeLabel = 'PBO';
                      } else if (contract.document_type === 'online_claims') {
                        contractTypeLabel = 'Online Claims';
                      } else if (contract.document_type === 'agency_retainer') {
                        contractTypeLabel = 'Agency Retainer Agreement';
                      } else if (contract.document_type === 'hipaa_release') {
                        contractTypeLabel = 'HIPAA Release';
                      } else if (contract.document_type === 'photo_release') {
                        contractTypeLabel = 'Photo Release';
                      } else {
                        contractTypeLabel = contract.document_type;
                      }
                      
                      renderedGroups.push(
                        <tr key={contract.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {contract.file_name || 'Unnamed file'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {contractTypeLabel}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user?.name || user?.phone || contract.user_id.substring(0, 8)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {contract.created_at ? new Date(contract.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-3">
                              <a
                                href={contract.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => deleteContract(contract.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                    
                    return renderedGroups;
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Existing Matches</h2>
              {canViewAllBranches && (
                <p className="text-sm text-gray-500 mt-1">
                  You can assign case managers by clicking the "Assign Manager" button in the Manager column
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  loadData();
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          <div className="space-y-4">
                {matches.map((m) => {
                  const surrogate = profileLookup[m.surrogate_id];
                  const parent = profileLookup[m.parent_id];
                  const surrogateStageKey = surrogate?.progress_stage || 'pre';
                  const surrogateStage = STAGE_LABELS[surrogateStageKey] || surrogateStageKey.toUpperCase();
                  const stageUpdater = (surrogate?.stage_updated_by || 'admin').toUpperCase();
                  const surrogatePosts = posts.filter((p) => p.user_id === m.surrogate_id);
                  const latestPosts = surrogatePosts.slice(0, 3);
                  const commentCount = comments.filter((c) => surrogatePosts.some((p) => p.id === c.post_id)).length;
                  const likeCount = postLikes.filter((l) => surrogatePosts.some((p) => p.id === l.post_id)).length;
                  const surrogateReports = medicalReports.filter((r) => r.user_id === m.surrogate_id);
                  const latestReports = surrogateReports.slice(0, 3);
                  
                  // Match data now contains all case fields directly
                  // Calculate pregnancy weeks from transfer_date if available
                  const calculatePregnancyWeeks = () => {
                    // First, try to use weeks_pregnant from match
                    if (m.weeks_pregnant && m.weeks_pregnant > 0) {
                      return m.weeks_pregnant;
                    }
                    
                    // Otherwise, calculate from transfer_date
                    const transferDate = surrogate?.transfer_date || m.transfer_date;
                    if (!transferDate) return null;
                    
                    try {
                      const transfer = new Date(transferDate);
                      const today = new Date();
                      
                      // Set both dates to midnight for accurate day calculation
                      transfer.setHours(0, 0, 0, 0);
                      today.setHours(0, 0, 0, 0);
                      
                      // Calculate days from transfer to today
                      const diffDays = Math.floor((today.getTime() - transfer.getTime()) / (24 * 60 * 60 * 1000));
                      
                      if (diffDays < 0) return null; // Transfer date is in the future
                      
                      // Day 5 embryo = 19 days gestational at transfer (14+5)
                      const transferGestationalDays = 19;
                      const gestationalDays = diffDays + transferGestationalDays;
                      const weeks = Math.floor(gestationalDays / 7);
                      const days = gestationalDays % 7;
                      
                      return { weeks, days, totalDays: gestationalDays };
                    } catch (err) {
                      console.error('Error calculating pregnancy weeks:', err);
                      return null;
                    }
                  };
                  
                  const pregnancyWeeks = calculatePregnancyWeeks();
                  
                  // Calculate due date from transfer_date
                  const calculateDueDate = () => {
                    // First, try to use estimated_due_date from match if available
                    if (m.estimated_due_date) {
                      return new Date(m.estimated_due_date);
                    }
                    
                    // Otherwise, calculate from transfer_date
                    const transferDate = surrogate?.transfer_date || m.transfer_date;
                    if (!transferDate) return null;
                    
                    try {
                      const transfer = new Date(transferDate);
                      transfer.setHours(0, 0, 0, 0);
                      
                      // Day 5 embryo = 19 days gestational at transfer (14+5)
                      // Normal pregnancy is 280 days (40 weeks)
                      // So from transfer date, we need 280 - 19 = 261 days to reach full term
                      const daysToAdd = 261; // 40 weeks - 19 days = 280 - 19 = 261 days
                      const dueDate = new Date(transfer);
                      dueDate.setDate(dueDate.getDate() + daysToAdd);
                      
                      return dueDate;
                    } catch (err) {
                      console.error('Error calculating due date:', err);
                      return null;
                    }
                  };
                  
                  const calculatedDueDate = calculateDueDate();
                  
                  // Debug log for matches with managers
                  if (m.managers && m.managers.length > 0) {
                    console.log('👥 Match managers debug:', {
                      matchId: m.id,
                      managersCount: m.managers.length,
                      managers: m.managers.map((mg: any) => ({ id: mg.id, name: mg.name })),
                      manager_ids: m.manager_ids,
                      manager_name: m.manager_name,
                    });
                  }
                  
                  return (
                    <div key={m.id || `${m.surrogate_id}-${m.parent_id}`} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
                      {/* Header Section */}
                      <div className="flex items-start justify-between border-b pb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {m.claim_id || `Match ${m.id?.substring(0, 8)}`}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              m.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : m.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : m.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {m.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                              {m.case_type || '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <Link
                              href={`/cases/${m.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              <span>📄</span>
                              Detail
                            </Link>
                            {m.updated_at && (
                              <span>Updated: {new Date(m.updated_at).toLocaleString()}</span>
                            )}
                            {m.created_at && (
                              <span>Created: {new Date(m.created_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Main Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Basic Information */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Basic Information</h4>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Surrogate</div>
                            <div className="text-sm font-medium text-gray-900">{surrogate?.name || m.surrogate_id}</div>
                            <div className="text-xs text-gray-500">{surrogate?.phone || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Parent</div>
                            <div className="text-sm font-medium text-gray-900">{m.first_parent_name || parent?.name || m.parent_id}</div>
                            <div className="text-xs text-gray-500">{parent?.phone || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Parent 2</div>
                            {editingParent2 === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={parent2Name}
                                  onChange={(e) => setParent2Name(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateParent2(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingParent2(null);
                                      setParent2Name('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateParent2(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingParent2(null);
                                    setParent2Name('');
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-400 hover:bg-gray-500 text-white rounded"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded text-sm text-gray-900"
                                onClick={() => {
                                  setEditingParent2(m.id);
                                  setParent2Name(m.second_parent_name || '');
                                }}
                                title="Click to edit Parent 2 name"
                              >
                                {m.second_parent_name || (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Manager</div>
                            {canViewAllBranches ? (
                              <div className="flex items-center gap-2">
                                {assigningManager === m.id ? (
                                  <div className="flex flex-col gap-2 w-full">
                                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2 bg-white">
                                      {adminUsers.map((admin) => {
                                        const isChecked = selectedManagerIds.includes(admin.id);
                                        return (
                                          <label key={admin.id} className="flex items-center gap-2 py-1 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                console.log('[matches] Checkbox changed:', {
                                                  adminId: admin.id,
                                                  adminName: admin.name,
                                                  checked: e.target.checked,
                                                  currentSelectedManagerIds: selectedManagerIds,
                                                  currentCount: selectedManagerIds.length,
                                                });
                                                if (e.target.checked) {
                                                  const newIds = [...selectedManagerIds, admin.id];
                                                  console.log('[matches] Adding manager, new selectedManagerIds:', {
                                                    newIds,
                                                    newCount: newIds.length,
                                                  });
                                                  setSelectedManagerIds(newIds);
                                                } else {
                                                  const newIds = selectedManagerIds.filter(id => id !== admin.id);
                                                  console.log('[matches] Removing manager, new selectedManagerIds:', {
                                                    newIds,
                                                    newCount: newIds.length,
                                                  });
                                                  setSelectedManagerIds(newIds);
                                                }
                                              }}
                                              className="rounded border-gray-300"
                                            />
                                            <span className="text-xs">
                                              {admin.name} ({admin.role})
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={async () => {
                                          console.log('[matches] Save button clicked:', {
                                            matchId: m.id,
                                            selectedManagerIds,
                                            selectedManagerIdsCount: selectedManagerIds.length,
                                          });
                                          await assignManagersToCase(m.id, selectedManagerIds);
                                        }}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                                      >
                                        ✓ Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setAssigningManager(null);
                                          setSelectedManagerIds([]);
                                        }}
                                        className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded"
                                      >
                                        ✕ Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-1">
                                      {(() => {
                                        const managersList = m.managers || [];
                                        console.log(`👥 Match ${m.id} managers debug:`, {
                                          matchId: m.id,
                                          managers: managersList,
                                          managersCount: managersList.length,
                                          manager_ids: m.manager_ids || [],
                                          manager_idsCount: m.manager_ids?.length || 0,
                                          manager_name: m.manager_name,
                                        });
                                        
                                        if (managersList.length > 0) {
                                          return (
                                            <div className="flex flex-wrap gap-x-1 gap-y-0.5 items-center">
                                              {managersList.map((manager: any, idx: number) => (
                                                <span key={`${m.id}-manager-${manager.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                                                  {manager.name}{idx < managersList.length - 1 ? ',' : ''}
                                                </span>
                                              ))}
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <span className="text-xs text-gray-600">
                                              {m.manager_name || 'No Manager'}
                                            </span>
                                          );
                                        }
                                      })()}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setAssigningManager(m.id);
                                        const managerIds = m.manager_ids 
                                          ? m.manager_ids.filter((id): id is string => id != null)
                                          : (m.manager_id ? [m.manager_id] : []);
                                        setSelectedManagerIds(managerIds);
                                      }}
                                      className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
                                      title="Assign Managers"
                                    >
                                      Assign Managers
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const managersList = m.managers || [];
                                  if (managersList.length > 0) {
                                    return (
                                      <div className="flex flex-wrap gap-x-1 gap-y-0.5 items-center">
                                        {managersList.map((manager: any, idx: number) => (
                                          <span key={`${m.id}-manager-${manager.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                                            {manager.name}{idx < managersList.length - 1 ? ',' : ''}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <span className="text-xs text-gray-600">
                                        {m.manager_name || '—'}
                                      </span>
                                    );
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pregnancy & Medical Information */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Pregnancy & Medical</h4>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Current Step</div>
                            <div className="text-sm text-gray-900">
                              {m.current_step ? (
                                <div className="max-w-xs">{m.current_step}</div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
                                    STAGE: {surrogateStage}
                                  </span>
                                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                                    BY: {stageUpdater}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Weeks Pregnant</div>
                            <div className="text-sm text-gray-900">
                              {pregnancyWeeks ? (
                                typeof pregnancyWeeks === 'number' ? (
                                  `${pregnancyWeeks} weeks`
                                ) : (
                                  `${pregnancyWeeks.weeks} weeks ${pregnancyWeeks.days} days`
                                )
                              ) : (
                                '—'
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Due Date</div>
                            <div className="text-sm text-gray-900">
                              {calculatedDueDate 
                                ? calculatedDueDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                                : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Fetuses</div>
                            {editingFetuses === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={fetusesValue}
                                  onChange={(e) => setFetusesValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateFetuses(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingFetuses(null);
                                      setFetusesValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateFetuses(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingFetuses(null);
                                    setFetusesValue('');
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-400 hover:bg-gray-500 text-white rounded"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded text-sm text-gray-900"
                                onClick={() => {
                                  setEditingFetuses(m.id);
                                  setFetusesValue(m.number_of_fetuses?.toString() || '');
                                }}
                                title="Click to edit number of fetuses"
                              >
                                {m.number_of_fetuses ?? (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Fetal Beat Confirm</div>
                            {editingFetalBeat === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={fetalBeatValue}
                                  onChange={(e) => setFetalBeatValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateFetalBeat(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingFetalBeat(null);
                                      setFetalBeatValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateFetalBeat(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingFetalBeat(null);
                                    setFetalBeatValue('');
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-400 hover:bg-gray-500 text-white rounded"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded text-sm text-gray-900"
                                onClick={() => {
                                  setEditingFetalBeat(m.id);
                                  setFetalBeatValue(m.fetal_beat_confirm || '');
                                }}
                                title="Click to edit Fetal Beat Confirm"
                              >
                                {m.fetal_beat_confirm || (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Important Dates */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Important Dates</h4>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Sign Date</div>
                            <div className="text-sm text-gray-900">
                              {m.sign_date 
                                ? new Date(m.sign_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                                : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Transfer Date</div>
                            <div className="text-sm text-gray-900">
                              {m.transfer_date 
                                ? new Date(m.transfer_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                                : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Beta Confirm Date</div>
                            <div className="text-sm text-gray-900">
                              {m.beta_confirm_date 
                                ? new Date(m.beta_confirm_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                                : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Clinic & Legal Information */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Clinic & Legal</h4>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Clinic</div>
                            <div className="text-sm text-gray-900">{m.clinic || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Embryos</div>
                            <div className="text-sm text-gray-900">{m.embryos || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Lawyer</div>
                            <div className="text-sm text-gray-900">{m.lawyer || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Company</div>
                            <div className="text-sm text-gray-900">{m.company || '—'}</div>
                          </div>
                        </div>

                        {/* Document Status */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Document Status</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={m.files?.customer_signed_contractfiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.customer_signed_contractfiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Customer Contract</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.attorney_contractfiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.attorney_contractfiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Attorney Contract</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.trust_account_contractfiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.trust_account_contractfiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Trust Account</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.surrogacy_contractfiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.surrogacy_contractfiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Surrogacy Contract</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.life_insurance_policyfiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.life_insurance_policyfiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Life Insurance</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.surrogate_health_insurancefiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.surrogate_health_insurancefiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Health Insurance</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.wire_recordfiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.wire_recordfiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Wire Record</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.monthly_statementfiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.monthly_statementfiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Monthly Statement</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.pbofiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.pbofiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">PBO</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={m.files?.attorney_retainer_agreementfiles ? 'text-green-600' : 'text-gray-400'}>
                                {m.files?.attorney_retainer_agreementfiles ? '✓' : '○'}
                              </span>
                              <span className="text-gray-600">Attorney Retainer</span>
                            </div>
                          </div>
                        </div>

                        {/* Posts & Medical Reports */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Activity</h4>
                          <div className="text-xs text-gray-700">
                            <div className="font-semibold mb-2">
                              Posts: {surrogatePosts.length} · Likes: {likeCount} · Comments: {commentCount}
                            </div>
                            {latestPosts.length === 0 ? (
                              <div className="text-gray-500 text-xs">No posts</div>
                            ) : (
                              <div className="space-y-2">
                                {latestPosts.map((p) => (
                                  <div key={p.id} className="p-2 rounded border border-gray-200 bg-gray-50">
                                    <div className="text-[11px] text-gray-500">
                                      {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                                      {p.stage ? ` · ${p.stage}` : ''}
                                    </div>
                                    <div className="text-sm text-gray-900 line-clamp-2">
                                      {p.content || p.text || '(no text)'}
                                    </div>
                                    {((p.media_url || p.media_uri) && (
                                      <a
                                        href={String(p.media_url || p.media_uri || '#')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        Media
                                      </a>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-300">
                            <div className="font-semibold text-sm text-green-700 mb-2">
                              Medical Check-ins: {surrogateReports.length}
                            </div>
                            {latestReports.length === 0 ? (
                              <div className="text-gray-500 text-xs">No medical reports</div>
                            ) : (
                              <div className="space-y-2">
                                {latestReports.map((r) => {
                                  const reportData = r.report_data || {};
                                  const visitDate = r.visit_date ? new Date(r.visit_date).toLocaleDateString() : '';
                                  let keyMetrics: string[] = [];
                                  
                                  if (r.stage === 'Pre-Transfer') {
                                    if (reportData.endometrial_thickness) keyMetrics.push(`Endometrial: ${reportData.endometrial_thickness}mm`);
                                    if (reportData.follicle_1_mm) keyMetrics.push(`Follicle: ${reportData.follicle_1_mm}mm`);
                                    if (reportData.labs && Array.isArray(reportData.labs) && reportData.labs.length > 0) {
                                      keyMetrics.push(`Labs: ${reportData.labs.slice(0, 2).join(', ')}`);
                                    }
                                  } else if (r.stage === 'Post-Transfer') {
                                    if (reportData.fetal_heart_rate) keyMetrics.push(`HR: ${reportData.fetal_heart_rate}bpm`);
                                    if (reportData.gestational_sac_diameter) keyMetrics.push(`Sac: ${reportData.gestational_sac_diameter}mm`);
                                    if (reportData.beta_hcg) keyMetrics.push(`Beta HCG: ${reportData.beta_hcg}`);
                                  } else if (r.stage === 'OBGYN') {
                                    if (reportData.weight) keyMetrics.push(`Weight: ${reportData.weight}lbs`);
                                    if (reportData.blood_pressure) keyMetrics.push(`BP: ${reportData.blood_pressure}`);
                                    if (reportData.fetal_heartbeats) keyMetrics.push(`FHR: ${reportData.fetal_heartbeats}bpm`);
                                  }
                                  
                                  return (
                                    <div key={r.id} className="p-2 rounded border border-green-200 bg-green-50">
                                      <div className="text-[11px] text-gray-600 font-semibold">
                                        {r.stage} · {visitDate}
                                        {r.provider_name && ` · ${r.provider_name}`}
                                      </div>
                                      {keyMetrics.length > 0 && (
                                        <div className="text-xs text-gray-700 mt-1">
                                          {keyMetrics.join(' · ')}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 mt-1">
                                        {r.proof_image_url && (
                                          <a
                                            href={r.proof_image_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                          >
                                            📎 View Proof
                                          </a>
                                        )}
                                        <button
                                          onClick={() => deleteMedicalReport(r.id)}
                                          className="text-xs text-red-600 hover:text-red-800 font-semibold"
                                          title="Delete this medical report"
                                        >
                                          🗑️ Delete
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Section */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Actions</h4>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex gap-1">
                            {STATUS_OPTIONS.map((s: string) => (
                              <button
                                key={s}
                                onClick={() => updateMatchStatus(m.id, s)}
                                className={`px-2 py-1 rounded border text-xs ${
                                  m.status === s
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                          <select
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                            value={surrogate?.progress_stage || 'pre'}
                            onChange={(e) => updateStage(m.surrogate_id, e.target.value)}
                          >
                            {STAGE_OPTIONS.map((st: string) => (
                              <option key={st} value={st}>
                                {STAGE_LABELS[st] || st.toUpperCase()}
                              </option>
                            ))}
                          </select>
                          {canViewAllBranches && m && (
                            <button
                              onClick={() => {
                                setAssigningManager(m.id);
                                const managerIds = m.manager_ids 
                                  ? m.manager_ids.filter((id): id is string => id != null)
                                  : (m.manager_id ? [m.manager_id] : []);
                                setSelectedManagerIds(managerIds);
                              }}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                              title="Assign Managers"
                            >
                              👤 Assign Managers
                            </button>
                          )}
                          <button
                            onClick={() => openContractModal(m)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            📄 Publish Contract
                          </button>
                          <button
                            onClick={() => openAttorneyModal(m)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            ⚖️ Upload Attorney Retainer
                          </button>
                          <button
                            onClick={() => openInsuranceModal(m)}
                            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            🛡️ Upload Life Insurance
                          </button>
                          <button
                            onClick={() => openHealthInsuranceModal(m)}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            ❤️ Upload Health Insurance Bill
                          </button>
                          <button
                            onClick={() => openPBOModal(m)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            📋 Upload PBO
                          </button>
                          <button
                            onClick={() => openClaimsModal(m)}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            ✅ Upload Online Claims
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {matches.length === 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
                    <div className="text-gray-500">No matches found. Create one above.</div>
                  </div>
                )}
          </div>
        </div>
      </div>

      {/* Contract Upload Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Publish Contract</h3>
              <button
                onClick={() => setShowContractModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogate
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[contractSurrogateId]?.name || contractSurrogateId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[contractParentId]?.name || contractParentId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {contractFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {contractFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The same contract will be published for both parties. Each party will sign their own copy.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowContractModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadContract}
                  disabled={uploadingContract || !contractFile}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingContract || !contractFile
                      ? 'bg-gray-400'
                      : 'bg-green-600 hover:bg-green-700'
                  } transition-colors`}
                >
                  {uploadingContract ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attorney Retainer Agreement Upload Modal */}
      {showAttorneyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Attorney Retainer Agreement</h3>
              <button
                onClick={() => setShowAttorneyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogate
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[attorneySurrogateId]?.name || attorneySurrogateId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[attorneyParentId]?.name || attorneyParentId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attorney Retainer Agreement File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setAttorneyFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {attorneyFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {attorneyFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The agreement will be visible to both parties in their My Match section.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAttorneyModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadAttorneyRetainer}
                  disabled={uploadingAttorney || !attorneyFile}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingAttorney || !attorneyFile
                      ? 'bg-gray-400'
                      : 'bg-purple-600 hover:bg-purple-700'
                  } transition-colors`}
                >
                  {uploadingAttorney ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Life Insurance Policy Upload Modal */}
      {showInsuranceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Surrogate Life Insurance Policy</h3>
              <button
                onClick={() => setShowInsuranceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogate
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[insuranceSurrogateId]?.name || insuranceSurrogateId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[insuranceParentId]?.name || insuranceParentId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Life Insurance Policy File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                />
                {insuranceFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {insuranceFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The policy will be visible to both parties in their My Match section.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowInsuranceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadLifeInsurance}
                  disabled={uploadingInsurance || !insuranceFile}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingInsurance || !insuranceFile
                      ? 'bg-gray-400'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  } transition-colors`}
                >
                  {uploadingInsurance ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Insurance Bill Upload Modal */}
      {showHealthInsuranceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Surrogate Health Insurance Bill</h3>
              <button
                onClick={() => setShowHealthInsuranceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogate
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[healthInsuranceSurrogateId]?.name || healthInsuranceSurrogateId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[healthInsuranceParentId]?.name || healthInsuranceParentId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Health Insurance Bill File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setHealthInsuranceFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
                {healthInsuranceFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {healthInsuranceFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The bill will be visible to both parties in their My Match section.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowHealthInsuranceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadHealthInsurance}
                  disabled={uploadingHealthInsurance || !healthInsuranceFile}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingHealthInsurance || !healthInsuranceFile
                      ? 'bg-gray-400'
                      : 'bg-orange-600 hover:bg-orange-700'
                  } transition-colors`}
                >
                  {uploadingHealthInsurance ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PBO Upload Modal */}
      {showPBOModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload PBO Document</h3>
              <button
                onClick={() => setShowPBOModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogate
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[pboSurrogateId]?.name || pboSurrogateId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[pboParentId]?.name || pboParentId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PBO Document File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setPBOFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {pboFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {pboFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The PBO document will be visible to both parties in their My Match section.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPBOModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadPBO}
                  disabled={uploadingPBO || !pboFile}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingPBO || !pboFile
                      ? 'bg-gray-400'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  } transition-colors`}
                >
                  {uploadingPBO ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Online Claims Upload Modal */}
      {showClaimsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Online Claims Document</h3>
              <button
                onClick={() => setShowClaimsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogate
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[claimsSurrogateId]?.name || claimsSurrogateId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[claimsParentId]?.name || claimsParentId}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Online Claims Document File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setClaimsFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
                {claimsFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {claimsFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The online claims document will be visible to both parties in their My Match section.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowClaimsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadOnlineClaims}
                  disabled={uploadingClaims || !claimsFile}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingClaims || !claimsFile
                      ? 'bg-gray-400'
                      : 'bg-teal-600 hover:bg-teal-700'
                  } transition-colors`}
                >
                  {uploadingClaims ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agency Retainer Agreement Upload Modal */}
      {showAgencyRetainerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Agency Retainer Agreement</h3>
              <button
                onClick={() => setShowAgencyRetainerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User *
                </label>
                <select
                  value={agencyRetainerUserId}
                  onChange={(e) => setAgencyRetainerUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">-- Select a user --</option>
                  {[...surrogates, ...parents].map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name || profile.id} ({profile.role === 'surrogate' ? 'Surrogate' : 'Parent'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agency Retainer Agreement File *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setAgencyRetainerFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                />
                {agencyRetainerFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {agencyRetainerFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The agency retainer agreement will be visible to the selected user in their User Center.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAgencyRetainerModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadAgencyRetainer}
                  disabled={uploadingAgencyRetainer || !agencyRetainerFile || !agencyRetainerUserId}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingAgencyRetainer || !agencyRetainerFile || !agencyRetainerUserId
                      ? 'bg-gray-400'
                      : 'bg-pink-600 hover:bg-pink-700'
                  } transition-colors`}
                >
                  {uploadingAgencyRetainer ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIPAA Release Upload Modal */}
      {showHipaaReleaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload HIPAA Release</h3>
              <button
                onClick={() => setShowHipaaReleaseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User *
                </label>
                <select
                  value={hipaaReleaseUserId}
                  onChange={(e) => setHipaaReleaseUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a user --</option>
                  {[...surrogates, ...parents].map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name || profile.id} ({profile.role === 'surrogate' ? 'Surrogate' : 'Parent'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HIPAA Release File *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setHipaaReleaseFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {hipaaReleaseFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {hipaaReleaseFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The HIPAA release will be visible to the selected user in their User Center.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowHipaaReleaseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadHipaaRelease}
                  disabled={uploadingHipaaRelease || !hipaaReleaseFile || !hipaaReleaseUserId}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingHipaaRelease || !hipaaReleaseFile || !hipaaReleaseUserId
                      ? 'bg-gray-400'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
                >
                  {uploadingHipaaRelease ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Release Upload Modal */}
      {showPhotoReleaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Photo Release</h3>
              <button
                onClick={() => setShowPhotoReleaseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User *
                </label>
                <select
                  value={photoReleaseUserId}
                  onChange={(e) => setPhotoReleaseUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select a user --</option>
                  {[...surrogates, ...parents].map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name || profile.id} ({profile.role === 'surrogate' ? 'Surrogate' : 'Parent'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo Release File *
                </label>
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg"
                  onChange={(e) => setPhotoReleaseFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {photoReleaseFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {photoReleaseFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: JPG, JPEG, PNG, GIF, WEBP, BMP, SVG (image files only). The photo release will be visible to the selected user in their User Center.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPhotoReleaseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadPhotoRelease}
                  disabled={uploadingPhotoRelease || !photoReleaseFile || !photoReleaseUserId}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingPhotoRelease || !photoReleaseFile || !photoReleaseUserId
                      ? 'bg-gray-400'
                      : 'bg-purple-600 hover:bg-purple-700'
                  } transition-colors`}
                >
                  {uploadingPhotoRelease ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

