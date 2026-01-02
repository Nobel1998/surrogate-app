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
  available?: boolean;
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
  egg_donation?: string | null;
  sperm_donation?: string | null;
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
  const [obAppointments, setObAppointments] = useState<any[]>([]);
  const [ivfAppointments, setIvfAppointments] = useState<any[]>([]);
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
  // Date fields
  const [editingSignDate, setEditingSignDate] = useState<string | null>(null);
  const [signDateValue, setSignDateValue] = useState<string>('');
  const [editingTransferDate, setEditingTransferDate] = useState<string | null>(null);
  const [transferDateValue, setTransferDateValue] = useState<string>('');
  const [editingBetaConfirmDate, setEditingBetaConfirmDate] = useState<string | null>(null);
  const [betaConfirmDateValue, setBetaConfirmDateValue] = useState<string>('');
  // Text fields
  const [editingClinic, setEditingClinic] = useState<string | null>(null);
  const [clinicValue, setClinicValue] = useState<string>('');
  const [editingEmbryos, setEditingEmbryos] = useState<string | null>(null);
  const [embryosValue, setEmbryosValue] = useState<string>('');
  const [editingLawyer, setEditingLawyer] = useState<string | null>(null);
  const [lawyerValue, setLawyerValue] = useState<string>('');
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [companyValue, setCompanyValue] = useState<string>('');
  const [editingEggDonation, setEditingEggDonation] = useState<string | null>(null);
  const [eggDonationValue, setEggDonationValue] = useState<string>('');
  const [editingSpermDonation, setEditingSpermDonation] = useState<string | null>(null);
  const [spermDonationValue, setSpermDonationValue] = useState<string>('');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedDocTypes, setExpandedDocTypes] = useState<Set<string>>(new Set());
  
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
  const [attorneyUserId, setAttorneyUserId] = useState<string>('');
  const [attorneyUserType, setAttorneyUserType] = useState<'parent' | 'surrogate'>('parent');
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
  const [claimsFile, setClaimsFile] = useState<File | null>(null);
  const [uploadingClaims, setUploadingClaims] = useState(false);
  
  // Agency Retainer Agreement upload state
  const [showAgencyRetainerModal, setShowAgencyRetainerModal] = useState(false);
  const [agencyRetainerUserId, setAgencyRetainerUserId] = useState<string>('');
  const [agencyRetainerFile, setAgencyRetainerFile] = useState<File | null>(null);
  const [uploadingAgencyRetainer, setUploadingAgencyRetainer] = useState(false);
  const [agencyRetainerUserType, setAgencyRetainerUserType] = useState<'parent' | 'surrogate' | null>(null);
  
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
  
  // Trust Account upload state
  const [showTrustAccountModal, setShowTrustAccountModal] = useState(false);
  const [trustAccountUserId, setTrustAccountUserId] = useState<string>('');
  const [trustAccountFile, setTrustAccountFile] = useState<File | null>(null);
  const [uploadingTrustAccount, setUploadingTrustAccount] = useState(false);
  const [trustAccountUserType, setTrustAccountUserType] = useState<'parent' | 'surrogate' | null>(null);
  
  // Customer Contract upload state (for parent)
  const [showCustomerContractModal, setShowCustomerContractModal] = useState(false);
  const [customerContractUserId, setCustomerContractUserId] = useState<string>('');
  const [customerContractFile, setCustomerContractFile] = useState<File | null>(null);
  const [uploadingCustomerContract, setUploadingCustomerContract] = useState(false);
  
  // Surrogacy Contract upload state (for surrogate) - kept for backward compatibility
  const [showSurrogacyContractModal, setShowSurrogacyContractModal] = useState(false);
  const [surrogacyContractUserId, setSurrogacyContractUserId] = useState<string>('');
  const [surrogacyContractFile, setSurrogacyContractFile] = useState<File | null>(null);
  const [uploadingSurrogacyContract, setUploadingSurrogacyContract] = useState(false);
  
  // Surrogacy Contract Shared upload state (for both parties)
  const [showSurrogacyContractSharedModal, setShowSurrogacyContractSharedModal] = useState(false);
  const [surrogacyContractSharedMatchId, setSurrogacyContractSharedMatchId] = useState<string | null>(null);
  const [surrogacyContractSharedFile, setSurrogacyContractSharedFile] = useState<File | null>(null);
  const [uploadingSurrogacyContractShared, setUploadingSurrogacyContractShared] = useState(false);
  
  // Medical info state
  const [medicalInfoMap, setMedicalInfoMap] = useState<Record<string, any>>({});
  const [loadingMedicalInfo, setLoadingMedicalInfo] = useState<Record<string, boolean>>({});

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
        obAppointments: appointmentsData = [],
        ivfAppointments: ivfAppointmentsData = [],
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
      setObAppointments(appointmentsData || []);
      setIvfAppointments(ivfAppointmentsData || []);
      setBranches(branchesData || []);
      setCurrentBranchFilter(branchFilter || null);
      setCanViewAllBranches(canViewAll !== false);
      
      // #region agent log
      const attorneyRetainerContracts = contractsData.filter((c: any) => c.document_type === 'attorney_retainer');
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'matches/page.tsx:loadData:afterSetContracts',message:'After loading contracts',data:{totalContracts:contractsData.length,attorneyRetainerCount:attorneyRetainerContracts.length,attorneyRetainerContracts:attorneyRetainerContracts.map((c:any)=>({id:c.id,userId:c.user_id,documentType:c.document_type,fileName:c.file_name,fileUrl:c.file_url}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
      // #endregion
      
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

  // Date field update functions
  const handleUpdateSignDate = async (matchId: string) => {
    try {
      const dateValue = signDateValue.trim() || null;
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sign_date: dateValue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Sign Date');
      }

      await loadData();
      setEditingSignDate(null);
      setSignDateValue('');
      alert('Sign Date updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Sign Date:', err);
      alert(err.message || 'Failed to update Sign Date');
    }
  };

  const handleUpdateTransferDate = async (matchId: string) => {
    try {
      const dateValue = transferDateValue.trim() || null;
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfer_date: dateValue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Transfer Date');
      }

      await loadData();
      setEditingTransferDate(null);
      setTransferDateValue('');
      alert('Transfer Date updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Transfer Date:', err);
      alert(err.message || 'Failed to update Transfer Date');
    }
  };

  const handleUpdateBetaConfirmDate = async (matchId: string) => {
    try {
      const dateValue = betaConfirmDateValue.trim() || null;
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beta_confirm_date: dateValue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Beta Confirm Date');
      }

      await loadData();
      setEditingBetaConfirmDate(null);
      setBetaConfirmDateValue('');
      alert('Beta Confirm Date updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Beta Confirm Date:', err);
      alert(err.message || 'Failed to update Beta Confirm Date');
    }
  };

  // Text field update functions
  const handleUpdateClinic = async (matchId: string) => {
    try {
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic: clinicValue.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Clinic');
      }

      await loadData();
      setEditingClinic(null);
      setClinicValue('');
      alert('Clinic updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Clinic:', err);
      alert(err.message || 'Failed to update Clinic');
    }
  };

  const handleUpdateEmbryos = async (matchId: string) => {
    try {
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embryos: embryosValue.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Embryos');
      }

      await loadData();
      setEditingEmbryos(null);
      setEmbryosValue('');
      alert('Embryos updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Embryos:', err);
      alert(err.message || 'Failed to update Embryos');
    }
  };

  const handleUpdateLawyer = async (matchId: string) => {
    try {
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyer: lawyerValue.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Lawyer');
      }

      await loadData();
      setEditingLawyer(null);
      setLawyerValue('');
      alert('Lawyer updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Lawyer:', err);
      alert(err.message || 'Failed to update Lawyer');
    }
  };

  const handleUpdateCompany = async (matchId: string) => {
    try {
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyValue.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Escrow');
      }

      await loadData();
      setEditingCompany(null);
      setCompanyValue('');
      alert('Escrow updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Escrow:', err);
      alert(err.message || 'Failed to update Escrow');
    }
  };

  const handleUpdateEggDonation = async (matchId: string) => {
    try {
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          egg_donation: eggDonationValue.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Egg Donation');
      }

      await loadData();
      setEditingEggDonation(null);
      setEggDonationValue('');
      alert('Egg Donation updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Egg Donation:', err);
      alert(err.message || 'Failed to update Egg Donation');
    }
  };

  const handleUpdateSpermDonation = async (matchId: string) => {
    try {
      const res = await fetch(`/api/cases/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sperm_donation: spermDonationValue.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update Sperm Donation');
      }

      await loadData();
      setEditingSpermDonation(null);
      setSpermDonationValue('');
      alert('Sperm Donation updated successfully');
    } catch (err: any) {
      console.error('[matches] Error updating Sperm Donation:', err);
      alert(err.message || 'Failed to update Sperm Donation');
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

  // Format date without timezone conversion to avoid date offset issues
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      // Parse date string directly to avoid timezone conversion
      // Handle both ISO format (2024-12-05) and full datetime strings
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        // Format as MM/DD/YYYY without timezone conversion
        return `${month}/${day}/${year}`;
      }
      // Fallback to Date object for other formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Format date for display (same logic, avoiding timezone issues)
  const formatDateOnly = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      // Parse date string directly to avoid timezone conversion
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        // Format as MM/DD/YYYY
        return `${month}/${day}/${year}`;
      }
      // Fallback: use UTC methods to avoid timezone conversion
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Load medical info for a surrogate
  const loadMedicalInfo = async (surrogateId: string) => {
    // Check if already loaded (including null/empty) or currently loading
    if (!surrogateId || surrogateId in medicalInfoMap || loadingMedicalInfo[surrogateId]) {
      return;
    }

    setLoadingMedicalInfo(prev => ({ ...prev, [surrogateId]: true }));
    try {
      const res = await fetch(`/api/surrogate-medical-info?user_id=${surrogateId}`);
      if (res.ok) {
        const data = await res.json();
        // Store the result even if it's null (to prevent re-fetching)
        setMedicalInfoMap(prev => ({ ...prev, [surrogateId]: data.data || 'empty' }));
      } else {
        // Mark as loaded with empty to prevent re-fetching
        setMedicalInfoMap(prev => ({ ...prev, [surrogateId]: 'empty' }));
      }
    } catch (error) {
      console.error('Error loading medical info:', error);
      // Mark as loaded with empty to prevent re-fetching
      setMedicalInfoMap(prev => ({ ...prev, [surrogateId]: 'empty' }));
    } finally {
      setLoadingMedicalInfo(prev => ({ ...prev, [surrogateId]: false }));
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

  const updateSurrogateAvailable = async (surrogateId: string, available: boolean) => {
    try {
      const res = await fetch(`/api/profiles/${surrogateId}/available`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update available status');
      }

      // Reload data to get updated available status
      await loadData();
      alert(`Surrogate status updated to: ${available ? 'Available' : 'Not Available'}`);
    } catch (err: any) {
      console.error('[matches] Error updating available status:', err);
      alert(err.message || 'Failed to update available status');
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

  const openCustomerContractModal = () => {
    setCustomerContractUserId('');
    setCustomerContractFile(null);
    setShowCustomerContractModal(true);
  };

  const uploadCustomerContract = async () => {
    if (!customerContractFile) {
      alert('Please select a file');
      return;
    }
    if (!customerContractUserId) {
      alert('Please select a user');
      return;
    }

    setUploadingCustomerContract(true);
    try {
      const formData = new FormData();
      formData.append('file', customerContractFile);
      formData.append('user_id', customerContractUserId);

      const res = await fetch('/api/matches/customer-contract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Customer Contract uploaded successfully! The user can now see it in their User Center.');
      setShowCustomerContractModal(false);
      setCustomerContractFile(null);
      setCustomerContractUserId('');
      await loadData();
    } catch (err: any) {
      console.error('Error uploading customer contract:', err);
      alert(err.message || 'Failed to upload customer contract');
    } finally {
      setUploadingCustomerContract(false);
    }
  };

  const openSurrogacyContractModal = () => {
    setSurrogacyContractUserId('');
    setSurrogacyContractFile(null);
    setShowSurrogacyContractModal(true);
  };

  const uploadSurrogacyContract = async () => {
    if (!surrogacyContractFile) {
      alert('Please select a file');
      return;
    }
    if (!surrogacyContractUserId) {
      alert('Please select a user');
      return;
    }

    setUploadingSurrogacyContract(true);
    try {
      const formData = new FormData();
      formData.append('file', surrogacyContractFile);
      formData.append('user_id', surrogacyContractUserId);

      const res = await fetch('/api/matches/surrogacy-contract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Surrogacy Contract (Surrogate) uploaded successfully! The user can now see it in their User Center.');
      setShowSurrogacyContractModal(false);
      setSurrogacyContractFile(null);
      setSurrogacyContractUserId('');
      await loadData();
    } catch (err: any) {
      console.error('Error uploading surrogacy contract:', err);
      alert(err.message || 'Failed to upload surrogacy contract');
    } finally {
      setUploadingSurrogacyContract(false);
    }
  };

  const uploadSurrogacyContractShared = async () => {
    if (!surrogacyContractSharedFile) {
      alert('Please select a file');
      return;
    }
    if (!surrogacyContractSharedMatchId) {
      alert('Match ID is required');
      return;
    }

    const match = matches.find(m => m.id === surrogacyContractSharedMatchId);
    if (!match) {
      alert('Match not found');
      return;
    }

    setUploadingSurrogacyContractShared(true);
    try {
      const formData = new FormData();
      formData.append('file', surrogacyContractSharedFile);
      formData.append('parent_id', match.parent_id || match.first_parent_id || '');
      formData.append('surrogate_id', match.surrogate_id);

      const res = await fetch('/api/matches/surrogacy-contract-shared', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Surrogacy Contract uploaded successfully! Both parent and surrogate can now see it in their My Match section.');
      setShowSurrogacyContractSharedModal(false);
      setSurrogacyContractSharedFile(null);
      setSurrogacyContractSharedMatchId(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading shared surrogacy contract:', err);
      alert(err.message || 'Failed to upload surrogacy contract');
    } finally {
      setUploadingSurrogacyContractShared(false);
    }
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

  const openAttorneyModal = (match: Match, userType: 'parent' | 'surrogate' = 'parent') => {
    setAttorneyMatchId(match.id);
    setAttorneyUserType(userType);
    if (userType === 'parent') {
      setAttorneyUserId(match.parent_id || match.first_parent_id || '');
    } else {
      setAttorneyUserId(match.surrogate_id);
    }
    setAttorneyFile(null);
    setShowAttorneyModal(true);
  };

  const uploadAttorneyRetainer = async () => {
    if (!attorneyFile) {
      alert('Please select a file');
      return;
    }
    if (!attorneyUserId) {
      alert('User ID is required');
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'matches/page.tsx:uploadAttorneyRetainer:start',message:'Starting attorney retainer upload',data:{userId:attorneyUserId,userType:attorneyUserType,fileName:attorneyFile.name,fileSize:attorneyFile.size},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    setUploadingAttorney(true);
    try {
      const formData = new FormData();
      formData.append('file', attorneyFile);
      formData.append('user_id', attorneyUserId);
      formData.append('user_type', attorneyUserType);

      const res = await fetch('/api/matches/attorney-retainer', {
        method: 'POST',
        body: formData,
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'matches/page.tsx:uploadAttorneyRetainer:afterFetch',message:'After fetch response',data:{resOk:res.ok,status:res.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion

      if (!res.ok) {
        const errText = await res.text();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'matches/page.tsx:uploadAttorneyRetainer:error',message:'Upload failed',data:{status:res.status,error:errText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'all'})}).catch(()=>{});
        // #endregion
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'matches/page.tsx:uploadAttorneyRetainer:success',message:'Upload successful',data:{result:result},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      
      alert(`Attorney Retainer Agreement uploaded successfully! The ${attorneyUserType} can now see it in their My Match section.`);
      setShowAttorneyModal(false);
      setAttorneyFile(null);
      await loadData();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'matches/page.tsx:uploadAttorneyRetainer:afterLoadData',message:'After loadData call',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      console.error('Error uploading attorney retainer:', err);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'matches/page.tsx:uploadAttorneyRetainer:exception',message:'Exception in upload',data:{error:err?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'all'})}).catch(()=>{});
      // #endregion
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
    setClaimsFile(null);
    setShowClaimsModal(true);
  };

  const uploadOnlineClaims = async () => {
    if (!claimsFile) {
      alert('Please select a file');
      return;
    }
    if (!claimsSurrogateId) {
      alert('Surrogate ID is required');
      return;
    }

    setUploadingClaims(true);
    try {
      const formData = new FormData();
      formData.append('file', claimsFile);
      formData.append('user_id', claimsSurrogateId);

      const res = await fetch('/api/matches/online-claims', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Online Claims document uploaded successfully! The surrogate can now see it in their My Match section.');
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
      setAgencyRetainerUserType(null);
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

  const openTrustAccountModal = (match: Match) => {
    setTrustAccountUserType('parent');
    setTrustAccountUserId(match.parent_id);
    setTrustAccountFile(null);
    setShowTrustAccountModal(true);
  };

  const uploadTrustAccount = async () => {
    if (!trustAccountFile) {
      alert('Please select a file');
      return;
    }
    if (!trustAccountUserId) {
      alert('User ID is required');
      return;
    }

    setUploadingTrustAccount(true);
    try {
      const formData = new FormData();
      formData.append('file', trustAccountFile);
      formData.append('user_id', trustAccountUserId);

      const res = await fetch('/api/matches/trust-account', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      const result = await res.json();
      alert('Trust Account document uploaded successfully! The user can now see it in their User Center.');
      setShowTrustAccountModal(false);
      setTrustAccountFile(null);
      setTrustAccountUserId('');
      setTrustAccountUserType(null);
      await loadData();
    } catch (err: any) {
      console.error('Error uploading trust account document:', err);
      alert(err.message || 'Failed to upload trust account document');
    } finally {
      setUploadingTrustAccount(false);
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


        {/* Surrogate Availability Management */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Surrogate Availability Management</h2>
          <p className="text-sm text-gray-600 mb-4">Set whether surrogates are available for matching. Only surrogates marked as "Available" will appear in the match dropdown.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surrogate Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {surrogates.map((s: Profile) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {s.name || s.id.substring(0, 8)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {s.phone || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                        s.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {s.available ? 'Available' : 'Not Available'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => updateSurrogateAvailable(s.id, !s.available)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          s.available
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {s.available ? 'Set Unavailable' : 'Set Available'}
                      </button>
                    </td>
                  </tr>
                ))}
                {surrogates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      No surrogates found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                {surrogates.filter((s: Profile) => s.available).map((s: Profile) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id} {s.phone ? `• ${s.phone}` : ''}
                  </option>
                ))}
              </select>
              {surrogates.filter((s: Profile) => s.available).length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No available surrogates. Please set surrogates as "Available" above.</p>
              )}
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
                      // Parse date string directly to avoid timezone issues
                      const dateMatch = transferDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
                      let transfer: Date;
                      
                      if (dateMatch) {
                        const [, year, month, day] = dateMatch;
                        // Create date in local timezone to avoid timezone conversion
                        transfer = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      } else {
                        transfer = new Date(transferDate);
                        transfer.setHours(0, 0, 0, 0);
                      }
                      
                      const today = new Date();
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
                      // Parse date string directly to avoid timezone issues
                      const dateMatch = m.estimated_due_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
                      if (dateMatch) {
                        const [, year, month, day] = dateMatch;
                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      }
                      return new Date(m.estimated_due_date);
                    }
                    
                    // Otherwise, calculate from transfer_date
                    const transferDate = surrogate?.transfer_date || m.transfer_date;
                    if (!transferDate) return null;
                    
                    try {
                      // Parse date string directly to avoid timezone issues
                      const dateMatch = transferDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
                      let transfer: Date;
                      
                      if (dateMatch) {
                        const [, year, month, day] = dateMatch;
                        // Create date in local timezone to avoid timezone conversion
                        transfer = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      } else {
                        transfer = new Date(transferDate);
                        transfer.setHours(0, 0, 0, 0);
                      }
                      
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
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <Link
                              href={`/cases/${m.id}/step-status`}
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
                          {m.notes && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Notes</div>
                              <div className="text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">{m.notes}</div>
                            </div>
                          )}
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
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1">Status</div>
                              <div className="flex flex-wrap gap-1">
                                {STATUS_OPTIONS.map((s: string) => (
                                  <button
                                    key={s}
                                    onClick={() => updateMatchStatus(m.id, s)}
                                    className={`px-2 py-1 rounded border text-xs ${
                                      m.status === s
                                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                                        : 'border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1">Stage</div>
                              <select
                                className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                                value={surrogate?.progress_stage || 'pre'}
                                onChange={(e) => updateStage(m.surrogate_id, e.target.value)}
                              >
                                {STAGE_OPTIONS.map((st: string) => (
                                  <option key={st} value={st}>
                                    {STAGE_LABELS[st] || st.toUpperCase()}
                                  </option>
                                ))}
                              </select>
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
                                ? (() => {
                                    const year = calculatedDueDate.getFullYear();
                                    const month = String(calculatedDueDate.getMonth() + 1).padStart(2, '0');
                                    const day = String(calculatedDueDate.getDate()).padStart(2, '0');
                                    return formatDateOnly(`${year}-${month}-${day}`);
                                  })()
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

                        {/* Surrogate Medical Information */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Surrogate Medical Info</h4>
                          {(() => {
                            const medicalInfoRaw = medicalInfoMap[m.surrogate_id];
                            const medicalInfo = medicalInfoRaw === 'empty' ? null : medicalInfoRaw;
                            const isLoading = loadingMedicalInfo[m.surrogate_id];
                            const hasLoaded = m.surrogate_id in medicalInfoMap;
                            
                            // Load medical info on first render
                            if (!hasLoaded && !isLoading && m.surrogate_id) {
                              loadMedicalInfo(m.surrogate_id);
                            }

                            if (isLoading) {
                              return <div className="text-xs text-gray-500">Loading...</div>;
                            }

                            if (!medicalInfo) {
                              return <div className="text-xs text-gray-500">No medical information available</div>;
                            }

                            return (
                              <div className="space-y-4">
                                {/* IVF Clinic */}
                                {(medicalInfo.ivf_clinic_name || medicalInfo.ivf_clinic_doctor_name) && (
                                  <div className="border-l-2 border-blue-500 pl-3">
                                    <div className="text-xs font-semibold text-blue-700 mb-1">IVF Clinic</div>
                                    {medicalInfo.ivf_clinic_name && (
                                      <div className="text-xs text-gray-900 mb-0.5">{medicalInfo.ivf_clinic_name}</div>
                                    )}
                                    {medicalInfo.ivf_clinic_doctor_name && (
                                      <div className="text-xs text-gray-600 mb-0.5">Doctor: {medicalInfo.ivf_clinic_doctor_name}</div>
                                    )}
                                    {medicalInfo.ivf_clinic_address && (
                                      <div className="text-xs text-gray-600 mb-0.5">{medicalInfo.ivf_clinic_address}</div>
                                    )}
                                    {medicalInfo.ivf_clinic_phone && (
                                      <div className="text-xs text-gray-600 mb-0.5">Phone: {medicalInfo.ivf_clinic_phone}</div>
                                    )}
                                    {medicalInfo.ivf_clinic_email && (
                                      <div className="text-xs text-gray-600">Email: {medicalInfo.ivf_clinic_email}</div>
                                    )}
                                  </div>
                                )}

                                {/* OB/GYN Doctor */}
                                {(medicalInfo.obgyn_doctor_name || medicalInfo.obgyn_clinic_name) && (
                                  <div className="border-l-2 border-green-500 pl-3">
                                    <div className="text-xs font-semibold text-green-700 mb-1">OB/GYN Doctor</div>
                                    {medicalInfo.obgyn_doctor_name && (
                                      <div className="text-xs text-gray-900 mb-0.5">Dr. {medicalInfo.obgyn_doctor_name}</div>
                                    )}
                                    {medicalInfo.obgyn_clinic_name && (
                                      <div className="text-xs text-gray-900 mb-0.5">{medicalInfo.obgyn_clinic_name}</div>
                                    )}
                                    {medicalInfo.obgyn_clinic_address && (
                                      <div className="text-xs text-gray-600 mb-0.5">{medicalInfo.obgyn_clinic_address}</div>
                                    )}
                                    {medicalInfo.obgyn_clinic_phone && (
                                      <div className="text-xs text-gray-600 mb-0.5">Phone: {medicalInfo.obgyn_clinic_phone}</div>
                                    )}
                                    {medicalInfo.obgyn_clinic_email && (
                                      <div className="text-xs text-gray-600">Email: {medicalInfo.obgyn_clinic_email}</div>
                                    )}
                                  </div>
                                )}

                                {/* Delivery Hospital */}
                                {medicalInfo.delivery_hospital_name && (
                                  <div className="border-l-2 border-purple-500 pl-3">
                                    <div className="text-xs font-semibold text-purple-700 mb-1">Delivery Hospital</div>
                                    <div className="text-xs text-gray-900 mb-0.5">{medicalInfo.delivery_hospital_name}</div>
                                    {medicalInfo.delivery_hospital_address && (
                                      <div className="text-xs text-gray-600 mb-0.5">{medicalInfo.delivery_hospital_address}</div>
                                    )}
                                    {medicalInfo.delivery_hospital_phone && (
                                      <div className="text-xs text-gray-600 mb-0.5">Phone: {medicalInfo.delivery_hospital_phone}</div>
                                    )}
                                    {medicalInfo.delivery_hospital_email && (
                                      <div className="text-xs text-gray-600">Email: {medicalInfo.delivery_hospital_email}</div>
                                    )}
                                  </div>
                                )}

                                {!medicalInfo.ivf_clinic_name && !medicalInfo.obgyn_doctor_name && !medicalInfo.delivery_hospital_name && (
                                  <div className="text-xs text-gray-500">No medical information provided</div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Important Dates */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Important Dates</h4>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Sign Date</div>
                            {editingSignDate === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  value={signDateValue}
                                  onChange={(e) => setSignDateValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateSignDate(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingSignDate(null);
                                      setSignDateValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateSignDate(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSignDate(null);
                                    setSignDateValue('');
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
                                  setEditingSignDate(m.id);
                                  if (m.sign_date) {
                                    const date = new Date(m.sign_date);
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    setSignDateValue(`${year}-${month}-${day}`);
                                  } else {
                                    setSignDateValue('');
                                  }
                                }}
                                title="Click to edit Sign Date"
                              >
                                {m.sign_date 
                                  ? formatDateOnly(m.sign_date)
                                  : <span className="text-gray-400 italic">Click to add</span>}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Transfer Date</div>
                            <div className="text-sm text-gray-900">
                              {(() => {
                                // Read transfer_date from surrogate's app input, fallback to match data
                                const transferDate = surrogate?.transfer_date || m.transfer_date;
                                return formatDateOnly(transferDate);
                              })()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Beta Confirm Date</div>
                            {editingBetaConfirmDate === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  value={betaConfirmDateValue}
                                  onChange={(e) => setBetaConfirmDateValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateBetaConfirmDate(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingBetaConfirmDate(null);
                                      setBetaConfirmDateValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateBetaConfirmDate(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingBetaConfirmDate(null);
                                    setBetaConfirmDateValue('');
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
                                  setEditingBetaConfirmDate(m.id);
                                  if (m.beta_confirm_date) {
                                    const date = new Date(m.beta_confirm_date);
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    setBetaConfirmDateValue(`${year}-${month}-${day}`);
                                  } else {
                                    setBetaConfirmDateValue('');
                                  }
                                }}
                                title="Click to edit Beta Confirm Date"
                              >
                                {m.beta_confirm_date 
                                  ? formatDateOnly(m.beta_confirm_date)
                                  : <span className="text-gray-400 italic">Click to add</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Clinic & Legal Information */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Clinic & Legal</h4>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Clinic</div>
                            {editingClinic === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={clinicValue}
                                  onChange={(e) => setClinicValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateClinic(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingClinic(null);
                                      setClinicValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateClinic(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingClinic(null);
                                    setClinicValue('');
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
                                  setEditingClinic(m.id);
                                  setClinicValue(m.clinic || '');
                                }}
                                title="Click to edit Clinic"
                              >
                                {m.clinic || (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Embryos</div>
                            {editingEmbryos === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={embryosValue}
                                  onChange={(e) => setEmbryosValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateEmbryos(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingEmbryos(null);
                                      setEmbryosValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateEmbryos(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingEmbryos(null);
                                    setEmbryosValue('');
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
                                  setEditingEmbryos(m.id);
                                  setEmbryosValue(m.embryos || '');
                                }}
                                title="Click to edit Embryos"
                              >
                                {m.embryos || (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Lawyer</div>
                            {editingLawyer === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={lawyerValue}
                                  onChange={(e) => setLawyerValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateLawyer(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingLawyer(null);
                                      setLawyerValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateLawyer(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingLawyer(null);
                                    setLawyerValue('');
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
                                  setEditingLawyer(m.id);
                                  setLawyerValue(m.lawyer || '');
                                }}
                                title="Click to edit Lawyer"
                              >
                                {m.lawyer || (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Escrow</div>
                            {editingCompany === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={companyValue}
                                  onChange={(e) => setCompanyValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateCompany(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingCompany(null);
                                      setCompanyValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateCompany(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCompany(null);
                                    setCompanyValue('');
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
                                  setEditingCompany(m.id);
                                  setCompanyValue(m.company || '');
                                }}
                                title="Click to edit Escrow"
                              >
                                {m.company || (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Egg Donation</div>
                            {editingEggDonation === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={eggDonationValue}
                                  onChange={(e) => setEggDonationValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateEggDonation(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingEggDonation(null);
                                      setEggDonationValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateEggDonation(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingEggDonation(null);
                                    setEggDonationValue('');
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
                                  setEditingEggDonation(m.id);
                                  setEggDonationValue(m.egg_donation || '');
                                }}
                                title="Click to edit Egg Donation"
                              >
                                {m.egg_donation || (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Sperm Donation</div>
                            {editingSpermDonation === m.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={spermDonationValue}
                                  onChange={(e) => setSpermDonationValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateSpermDonation(m.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingSpermDonation(null);
                                      setSpermDonationValue('');
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateSpermDonation(m.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSpermDonation(null);
                                    setSpermDonationValue('');
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
                                  setEditingSpermDonation(m.id);
                                  setSpermDonationValue(m.sperm_donation || '');
                                }}
                                title="Click to edit Sperm Donation"
                              >
                                {m.sperm_donation || (
                                  <span className="text-gray-400 italic">Click to add</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Document Status */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Document Status</h4>
                          {(() => {
                            // Filter contracts related to this match (for match documents)
                            const matchContracts = contracts.filter(c => 
                              c.user_id === m.surrogate_id || 
                              c.user_id === m.parent_id || 
                              c.user_id === m.first_parent_id || 
                              c.user_id === m.second_parent_id
                            );
                            
                            // Filter contracts for surrogate only (for single user documents)
                            const surrogateOnlyContracts = contracts.filter(c => 
                              c.user_id === m.surrogate_id &&
                              (c.document_type === 'agency_retainer' || 
                               c.document_type === 'hipaa_release' || 
                               c.document_type === 'photo_release' ||
                               c.document_type === 'online_claims')
                            );
                            
                            // Filter contracts for parent only (for Agency Retainer Agreement)
                            const parentAgencyRetainerContracts = contracts.filter(c => 
                              c.user_id === m.parent_id &&
                              c.document_type === 'agency_retainer'
                            );
                            
                            // Filter contracts for surrogate only (for Agency Retainer Agreement)
                            const surrogateAgencyRetainerContracts = contracts.filter(c => 
                              c.user_id === m.surrogate_id &&
                              c.document_type === 'agency_retainer'
                            );
                            
                            // Filter contracts for parent only (for Attorney Retainer)
                            const parentAttorneyRetainerContracts = contracts.filter(c => 
                              (c.user_id === m.parent_id || c.user_id === m.first_parent_id) &&
                              c.document_type === 'attorney_retainer'
                            );
                            
                            // Filter contracts for surrogate only (for Attorney Retainer)
                            const surrogateAttorneyRetainerContracts = contracts.filter(c => 
                              c.user_id === m.surrogate_id &&
                              c.document_type === 'attorney_retainer'
                            );
                            
                            // #region agent log
                            if (parentAttorneyRetainerContracts.length > 0 || surrogateAttorneyRetainerContracts.length > 0) {
                              fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'matches/page.tsx:attorneyRetainerFilter',message:'Attorney retainer contracts found',data:{matchId:m.id,parentContracts:parentAttorneyRetainerContracts.length,parentContractsData:parentAttorneyRetainerContracts.map(c=>({id:c.id,userId:c.user_id,documentType:c.document_type,fileName:c.file_name})),surrogateContracts:surrogateAttorneyRetainerContracts.length,surrogateContractsData:surrogateAttorneyRetainerContracts.map(c=>({id:c.id,userId:c.user_id,documentType:c.document_type,fileName:c.file_name})),allContractsCount:contracts.length,allAttorneyRetainerContracts:contracts.filter(c=>c.document_type==='attorney_retainer').map(c=>({id:c.id,userId:c.user_id,documentType:c.document_type,fileName:c.file_name}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
                            }
                            // #endregion
                            
                            // Helper function to get files for a document type
                            const getFilesForDocType = (docTypes: string[], isSingleUser: boolean = false) => {
                              if (docTypes.length === 0) {
                                // For empty array, return empty (used for categories without specific document types)
                                return [];
                              }
                              const sourceContracts = isSingleUser ? surrogateOnlyContracts : matchContracts;
                              return sourceContracts.filter(c => docTypes.includes(c.document_type));
                            };
                            
                            // Helper function to get files for a specific document type by name
                            const getFilesByDocumentType = (docType: string, isSingleUser: boolean = false) => {
                              const sourceContracts = isSingleUser ? surrogateOnlyContracts : matchContracts;
                              return sourceContracts.filter(c => c.document_type === docType);
                            };
                            
                            // Helper function to identify user type
                            const getUserType = (userId: string): 'surrogate' | 'parent' | null => {
                              if (userId === m.surrogate_id) return 'surrogate';
                              if (userId === m.parent_id || userId === m.first_parent_id || userId === m.second_parent_id) return 'parent';
                              return null;
                            };
                            
                            // Helper function to merge duplicate files
                            const mergeDuplicateFiles = (files: Contract[]) => {
                              const fileMap = new Map<string, {
                                file_name: string;
                                file_url: string;
                                uploaders: Array<{
                                  user_id: string;
                                  user_type: 'surrogate' | 'parent' | null;
                                  contract_id: string;
                                  created_at: string | null;
                                }>;
                              }>();
                              
                              files.forEach(contract => {
                                // Use file_name as key, fallback to file_url if file_name is missing
                                const key = contract.file_name || contract.file_url;
                                const userType = getUserType(contract.user_id);
                                
                                if (fileMap.has(key)) {
                                  const existing = fileMap.get(key)!;
                                  // Check if this user already uploaded this file
                                  const alreadyExists = existing.uploaders.some(u => u.user_id === contract.user_id);
                                  if (!alreadyExists) {
                                    existing.uploaders.push({
                                      user_id: contract.user_id,
                                      user_type: userType,
                                      contract_id: contract.id,
                                      created_at: contract.created_at || null,
                                    });
                                  }
                                } else {
                                  fileMap.set(key, {
                                    file_name: contract.file_name || 'Unnamed file',
                                    file_url: contract.file_url,
                                    uploaders: [{
                                      user_id: contract.user_id,
                                      user_type: userType,
                                      contract_id: contract.id,
                                      created_at: contract.created_at || null,
                                    }],
                                  });
                                }
                              });
                              
                              return Array.from(fileMap.values());
                            };
                            
                            // Helper function to format uploaders display
                            const formatUploaders = (uploaders: Array<{ user_id: string; user_type: 'surrogate' | 'parent' | null }>) => {
                              const surrogates = uploaders.filter(u => u.user_type === 'surrogate');
                              const parents = uploaders.filter(u => u.user_type === 'parent');
                              
                              const parts: string[] = [];
                              
                              // Get actual user names from profileLookup
                              if (surrogates.length > 0) {
                                const surrogateNames = surrogates.map(u => {
                                  const profile = profileLookup[u.user_id];
                                  return profile?.name || profile?.phone || u.user_id.substring(0, 8);
                                });
                                parts.push(...surrogateNames);
                              }
                              
                              if (parents.length > 0) {
                                const parentNames = parents.map(u => {
                                  const profile = profileLookup[u.user_id];
                                  return profile?.name || profile?.phone || u.user_id.substring(0, 8);
                                });
                                parts.push(...parentNames);
                              }
                              
                              return parts.length > 0 ? parts.join(' & ') : 'Unknown';
                            };
                            
                            // Helper function to render file list for a document type
                            const renderFileList = (docTypeKey: string, docTypes: string[], label: string, isSingleUser: boolean = false, customFiles?: Contract[]) => {
                              // Use custom files if provided, otherwise use standard logic
                              let docFiles: Contract[];
                              if (customFiles) {
                                docFiles = customFiles;
                              } else {
                                // Special handling for trust_account which uses document_type directly
                                docFiles = docTypeKey === 'trust_account' 
                                  ? getFilesByDocumentType('trust_account', isSingleUser)
                                  : getFilesForDocType(docTypes, isSingleUser);
                              }
                              const mergedFiles = mergeDuplicateFiles(docFiles);
                              const hasFiles = mergedFiles.length > 0;
                              const isExpanded = expandedDocTypes.has(`${m.id}-${docTypeKey}`);
                              
                              return (
                                <div key={docTypeKey} className="space-y-1">
                                  <div 
                                    className={`flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded ${hasFiles ? '' : 'opacity-60'}`}
                                    onClick={() => {
                                      if (hasFiles) {
                                        const newExpanded = new Set(expandedDocTypes);
                                        const key = `${m.id}-${docTypeKey}`;
                                        if (newExpanded.has(key)) {
                                          newExpanded.delete(key);
                                        } else {
                                          newExpanded.add(key);
                                        }
                                        setExpandedDocTypes(newExpanded);
                                      }
                                    }}
                                  >
                                    <span className={hasFiles ? 'text-green-600' : 'text-gray-400'}>
                                      {hasFiles ? '✓' : '○'}
                                    </span>
                                    <span className="text-gray-600 flex-1">{label}</span>
                                    {hasFiles && (
                                      <span className="text-[10px] text-gray-400">
                                        ({mergedFiles.length}) {isExpanded ? '▼' : '▶'}
                                      </span>
                                    )}
                                  </div>
                                  {isExpanded && hasFiles && (
                                    <div className="ml-4 space-y-1.5 border-l-2 border-gray-200 pl-2">
                                      {mergedFiles.map((fileGroup, idx) => {
                                        const earliestDate = fileGroup.uploaders
                                          .map(u => u.created_at)
                                          .filter(d => d)
                                          .sort()[0];
                                        
                                        return (
                                          <div key={`${fileGroup.file_url}-${idx}`} className="p-1.5 bg-gray-50 rounded border border-gray-200 text-[10px]">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 truncate">
                                                  {fileGroup.file_name}
                                                </div>
                                                <div className="text-gray-500 mt-0.5">
                                                  {formatUploaders(fileGroup.uploaders)}
                                                </div>
                                                {earliestDate && (
                                                  <div className="text-gray-400 mt-0.5">
                                                    {formatDateOnly(earliestDate.split('T')[0])}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1.5 ml-2">
                                                <a
                                                  href={fileGroup.file_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:text-blue-800"
                                                  title="Download"
                                                >
                                                  📥
                                                </a>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Delete this file? This will delete ${fileGroup.uploaders.length} file record(s).`)) {
                                                      // Delete all file records for this file
                                                      fileGroup.uploaders.forEach(uploader => {
                                                        deleteContract(uploader.contract_id);
                                                      });
                                                    }
                                                  }}
                                                  className="text-red-600 hover:text-red-800"
                                                  title="Delete all copies"
                                                >
                                                  🗑️
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            };
                            
                            // Filter contracts for parent only (for Customer Contract)
                            const parentOnlyContracts = contracts.filter(c => 
                              c.user_id === m.parent_id &&
                              c.document_type === 'parent_contract'
                            );
                            
                            // Filter contracts for surrogate only (for Surrogacy Contract)
                            const surrogateOnlyContractsForContract = contracts.filter(c => 
                              c.user_id === m.surrogate_id &&
                              c.document_type === 'surrogate_contract'
                            );
                            
                            // Filter contracts for Surrogacy Contract (Shared - includes both parent and surrogate contracts)
                            const surrogacyContractShared = contracts.filter(c => 
                              (c.user_id === m.parent_id || c.user_id === m.first_parent_id || c.user_id === m.surrogate_id) &&
                              (c.document_type === 'parent_contract' || c.document_type === 'surrogate_contract')
                            );
                            
                            // Filter contracts for parent only (for Trust Account)
                            const parentTrustAccountContracts = contracts.filter(c => 
                              c.user_id === m.parent_id &&
                              c.document_type === 'trust_account'
                            );
                            
                            // Filter contracts for surrogate only (for Online Claims)
                            const surrogateOnlineClaimsContracts = contracts.filter(c => 
                              c.user_id === m.surrogate_id &&
                              c.document_type === 'online_claims'
                            );
                            
                            return (
                              <div className="space-y-3">
                                {/* Shared Documents - visible to both parties */}
                                <div>
                                  <div className="text-xs font-semibold text-gray-600 mb-2">Shared Documents</div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {renderFileList('surrogacy_contract', ['parent_contract', 'surrogate_contract'], 'Surrogacy Contract', false, surrogacyContractShared)}
                                    {renderFileList('life_insurance', ['insurance_policy'], 'Life Insurance')}
                                    {renderFileList('health_insurance', ['health_insurance_bill'], 'Health Insurance')}
                                    {renderFileList('pbo', ['parental_rights'], 'PBO')}
                                  </div>
                                </div>
                                
                                {/* Single User Documents - visible to individual users only */}
                                <div className="pt-2 border-t border-gray-300">
                                  <div className="text-xs font-semibold text-gray-600 mb-2">Single User Documents</div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {renderFileList('agency_retainer_parent', ['agency_retainer'], 'Agency Retainer (Parent)', true, parentAgencyRetainerContracts)}
                                    {renderFileList('agency_retainer_surrogate', ['agency_retainer'], 'Agency Retainer (Surrogate)', true, surrogateAgencyRetainerContracts)}
                                    {renderFileList('trust_account', ['trust_account'], 'Trust Account', true, parentTrustAccountContracts)}
                                    {renderFileList('attorney_retainer_parent', ['attorney_retainer'], 'Attorney Retainer (Parent)', true, parentAttorneyRetainerContracts)}
                                    {renderFileList('attorney_retainer_surrogate', ['attorney_retainer'], 'Attorney Retainer (Surrogate)', true, surrogateAttorneyRetainerContracts)}
                                    {renderFileList('hipaa_release', ['hipaa_release'], 'HIPAA Release', true)}
                                    {renderFileList('photo_release', ['photo_release'], 'Photo Release', true)}
                                    {renderFileList('online_claims', ['online_claims'], 'Online Claims', true, surrogateOnlineClaimsContracts)}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
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
                                  const visitDate = formatDateOnly(r.visit_date);
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
                          <div className="mt-2 pt-2 border-t border-gray-300">
                            {(() => {
                              const surrogateOBAppointments = obAppointments.filter((a) => a.user_id === m.surrogate_id);
                              const surrogateIVFAppointments = ivfAppointments.filter((a) => a.user_id === m.surrogate_id);
                              const upcomingOBAppointments = surrogateOBAppointments
                                .filter((a) => a.status === 'scheduled')
                                .slice(0, 5);
                              const upcomingIVFAppointments = surrogateIVFAppointments
                                .filter((a) => a.status === 'scheduled')
                                .slice(0, 5);
                              
                              return (
                                <>
                                  <div className="font-semibold text-sm text-blue-700 mb-2">
                                    OB Appointments: {surrogateOBAppointments.length} total ({surrogateOBAppointments.filter(a => a.status === 'scheduled').length} scheduled)
                                  </div>
                                  {upcomingOBAppointments.length === 0 ? (
                                    <div className="text-gray-500 text-xs">No upcoming OB appointments</div>
                                  ) : (
                                    <div className="space-y-2">
                                      {upcomingOBAppointments.map((appointment) => {
                                        const appointmentDate = formatDateOnly(appointment.appointment_date);
                                        const appointmentTime = appointment.appointment_time ? 
                                          new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
                                        
                                        return (
                                          <div key={appointment.id} className="p-2 rounded border border-blue-200 bg-blue-50">
                                            <div className="text-[11px] text-gray-600 font-semibold">
                                              {appointmentDate} {appointmentTime && `· ${appointmentTime}`}
                                            </div>
                                            <div className="text-xs text-gray-700 mt-1">
                                              {appointment.provider_name && `Dr. ${appointment.provider_name}`}
                                              {appointment.clinic_name && ` · ${appointment.clinic_name}`}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                              {appointment.status && (
                                                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] ${
                                                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                  appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                  'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                  {appointment.status}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <div className="font-semibold text-sm text-purple-700 mb-2 mt-3">
                                    IVF Appointments: {surrogateIVFAppointments.length} total ({surrogateIVFAppointments.filter(a => a.status === 'scheduled').length} scheduled)
                                  </div>
                                  {upcomingIVFAppointments.length === 0 ? (
                                    <div className="text-gray-500 text-xs">No upcoming IVF appointments</div>
                                  ) : (
                                    <div className="space-y-2">
                                      {upcomingIVFAppointments.map((appointment) => {
                                        const appointmentDate = formatDateOnly(appointment.appointment_date);
                                        const appointmentTime = appointment.appointment_time ? 
                                          new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
                                        
                                        return (
                                          <div key={appointment.id} className="p-2 rounded border border-purple-200 bg-purple-50">
                                            <div className="text-[11px] text-gray-600 font-semibold">
                                              {appointmentDate} {appointmentTime && `· ${appointmentTime}`}
                                            </div>
                                            <div className="text-xs text-gray-700 mt-1">
                                              {appointment.provider_name && `Dr. ${appointment.provider_name}`}
                                              {appointment.clinic_name && ` · ${appointment.clinic_name}`}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                              {appointment.status && (
                                                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] ${
                                                  appointment.status === 'scheduled' ? 'bg-purple-100 text-purple-700' :
                                                  appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                  'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                  {appointment.status}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Actions Section */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Actions</h4>
                        
                        {/* Single User Documents */}
                        <div className="mb-4">
                          <div className="text-xs font-semibold text-gray-600 mb-2">Single User Documents</div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setAgencyRetainerUserType('parent');
                                setAgencyRetainerUserId(m.parent_id);
                                setAgencyRetainerFile(null);
                                setShowAgencyRetainerModal(true);
                              }}
                              className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              📄 Upload Agency Retainer (Parent)
                            </button>
                            <button
                              onClick={() => {
                                setAgencyRetainerUserType('surrogate');
                                setAgencyRetainerUserId(m.surrogate_id);
                                setAgencyRetainerFile(null);
                                setShowAgencyRetainerModal(true);
                              }}
                              className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              📄 Upload Agency Retainer (Surrogate)
                            </button>
                            <button
                              onClick={() => {
                                setHipaaReleaseUserId(m.surrogate_id);
                                setShowHipaaReleaseModal(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              🔒 Upload HIPAA Release
                            </button>
                            <button
                              onClick={() => {
                                setPhotoReleaseUserId(m.surrogate_id);
                                setShowPhotoReleaseModal(true);
                              }}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              📷 Upload Photo Release
                            </button>
                            <button
                              onClick={() => openAttorneyModal(m, 'parent')}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              ⚖️ Upload Attorney Retainer (Parent)
                            </button>
                            <button
                              onClick={() => openAttorneyModal(m, 'surrogate')}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              ⚖️ Upload Attorney Retainer (Surrogate)
                            </button>
                            <button
                              onClick={() => openTrustAccountModal(m)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              💰 Upload Trust Account
                            </button>
                            <button
                              onClick={() => openClaimsModal(m)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              ✅ Upload Online Claims
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Upload documents for individual users. Each user will see their own document in User Center.
                          </p>
                        </div>

                        {/* Shared Documents */}
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-2">Shared Documents</div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSurrogacyContractSharedMatchId(m.id);
                                setSurrogacyContractSharedFile(null);
                                setShowSurrogacyContractSharedModal(true);
                              }}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              📄 Upload Surrogacy Contract
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
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Upload documents for this match. Both surrogate and parent(s) will see these documents in their My Match section.
                          </p>
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
                  {attorneyUserType === 'parent' ? 'Parent' : 'Surrogate'}
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[attorneyUserId]?.name || attorneyUserId}
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
                  Supported formats: PDF, DOC, DOCX, TXT. The agreement will be visible to the {attorneyUserType} in their My Match section.
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
                  Supported formats: PDF, DOC, DOCX, TXT. The online claims document will be visible only to the surrogate in their My Match section.
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
              <h3 className="text-xl font-bold text-gray-900">
                Upload Agency Retainer Agreement {agencyRetainerUserType === 'parent' ? '(Parent)' : agencyRetainerUserType === 'surrogate' ? '(Surrogate)' : ''}
              </h3>
              <button
                onClick={() => {
                  setShowAgencyRetainerModal(false);
                  setAgencyRetainerUserType(null);
                  setAgencyRetainerUserId('');
                  setAgencyRetainerFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {agencyRetainerUserType === 'parent' ? 'Parent' : agencyRetainerUserType === 'surrogate' ? 'Surrogate' : 'User'}
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {agencyRetainerUserType === 'parent' && profileLookup[agencyRetainerUserId] ? (
                    `${profileLookup[agencyRetainerUserId].name || agencyRetainerUserId} (Parent)`
                  ) : agencyRetainerUserType === 'surrogate' && profileLookup[agencyRetainerUserId] ? (
                    `${profileLookup[agencyRetainerUserId].name || agencyRetainerUserId} (Surrogate)`
                  ) : (
                    'N/A'
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This document will be uploaded for the {agencyRetainerUserType === 'parent' ? 'parent' : 'surrogate'} in this match.
                </p>
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

      {/* Customer Contract Upload Modal */}
      {showCustomerContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Surrogacy Contract (Parent)</h3>
              <button
                onClick={() => setShowCustomerContractModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[customerContractUserId] ? (
                    `${profileLookup[customerContractUserId].name || customerContractUserId} (Parent)`
                  ) : (
                    'N/A'
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This document will be uploaded for the parent in this match.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogacy Contract File (Parent) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setCustomerContractFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {customerContractFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {customerContractFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The surrogacy contract will be visible to the selected parent in their User Center.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCustomerContractModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadCustomerContract}
                  disabled={uploadingCustomerContract || !customerContractFile || !customerContractUserId}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingCustomerContract || !customerContractFile || !customerContractUserId
                      ? 'bg-gray-400'
                      : 'bg-green-600 hover:bg-green-700'
                  } transition-colors`}
                >
                  {uploadingCustomerContract ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surrogacy Contract Upload Modal */}
      {showSurrogacyContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Surrogacy Contract (Surrogate)</h3>
              <button
                onClick={() => setShowSurrogacyContractModal(false)}
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
                  {profileLookup[surrogacyContractUserId] ? (
                    `${profileLookup[surrogacyContractUserId].name || surrogacyContractUserId} (Surrogate)`
                  ) : (
                    'N/A'
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This document will be uploaded for the surrogate in this match.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surrogacy Contract File (Surrogate) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setSurrogacyContractFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {surrogacyContractFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {surrogacyContractFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT. The surrogacy contract will be visible to the selected surrogate in their User Center.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSurrogacyContractModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadSurrogacyContract}
                  disabled={uploadingSurrogacyContract || !surrogacyContractFile || !surrogacyContractUserId}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingSurrogacyContract || !surrogacyContractFile || !surrogacyContractUserId
                      ? 'bg-gray-400'
                      : 'bg-green-600 hover:bg-green-700'
                  } transition-colors`}
                >
                  {uploadingSurrogacyContract ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surrogacy Contract Shared Upload Modal */}
      {showSurrogacyContractSharedModal && surrogacyContractSharedMatchId && (() => {
        const match = matches.find(m => m.id === surrogacyContractSharedMatchId);
        if (!match) return null;
        const parentProfile = profileLookup[match.parent_id || match.first_parent_id || ''];
        const surrogateProfile = profileLookup[match.surrogate_id];
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Upload Surrogacy Contract (Shared)</h3>
                <button
                  onClick={() => setShowSurrogacyContractSharedModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                    {parentProfile?.name || match.parent_id || match.first_parent_id || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surrogate
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                    {surrogateProfile?.name || match.surrogate_id || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surrogacy Contract File *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setSurrogacyContractSharedFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  {surrogacyContractSharedFile && (
                    <div className="mt-2 text-xs text-gray-500">
                      Selected: {surrogacyContractSharedFile.name}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Supported formats: PDF, DOC, DOCX, TXT. The same contract will be visible to both parent and surrogate in their My Match section.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSurrogacyContractSharedModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={uploadSurrogacyContractShared}
                    disabled={uploadingSurrogacyContractShared || !surrogacyContractSharedFile}
                    className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                      uploadingSurrogacyContractShared || !surrogacyContractSharedFile
                        ? 'bg-gray-400'
                        : 'bg-green-600 hover:bg-green-700'
                    } transition-colors`}
                  >
                    {uploadingSurrogacyContractShared ? 'Uploading...' : 'Upload & Publish'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Trust Account Upload Modal */}
      {showTrustAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Trust Account</h3>
              <button
                onClick={() => {
                  setShowTrustAccountModal(false);
                  setTrustAccountUserType(null);
                  setTrustAccountUserId('');
                  setTrustAccountFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profileLookup[trustAccountUserId] ? (
                    `${profileLookup[trustAccountUserId].name || trustAccountUserId} (Parent)`
                  ) : (
                    'N/A'
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This document will be uploaded for the parent in this match.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trust Account Document *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => setTrustAccountFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
                {trustAccountFile && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {trustAccountFile.name}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG. Upload trust account documents (trust agreements, wire receipts, etc.). The document will be visible to the selected user in their User Center.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowTrustAccountModal(false);
                    setTrustAccountUserType(null);
                    setTrustAccountUserId('');
                    setTrustAccountFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadTrustAccount}
                  disabled={uploadingTrustAccount || !trustAccountFile || !trustAccountUserId}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    uploadingTrustAccount || !trustAccountFile || !trustAccountUserId
                      ? 'bg-gray-400'
                      : 'bg-teal-600 hover:bg-teal-700'
                  } transition-colors`}
                >
                  {uploadingTrustAccount ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

