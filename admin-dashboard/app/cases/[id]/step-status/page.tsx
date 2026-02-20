'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Stage labels for displaying friendly names
const STAGE_LABELS: Record<string, string> = {
  'pre': 'Pre-Screening',
  'match': 'Matching',
  'medical': 'Medical Screening',
  'legal': 'Legal Process',
  'transfer': 'Embryo Transfer',
  'pregnancy': 'Pregnancy',
  'delivery': 'Delivery',
  'postpartum': 'Postpartum',
  'complete': 'Complete',
};

type CaseDetail = {
  id: string;
  claim_id: string;
  surrogate_id?: string;
  first_parent_id?: string;
  second_parent_id?: string;
  case_type?: string;
  current_step?: string;
  weeks_pregnant?: number;
  estimated_due_date?: string;
  number_of_fetuses?: number;
  fetal_beat_confirm?: string;
  sign_date?: string;
  transfer_date?: string;
  beta_confirm_date?: string;
  due_date?: string;
  clinic?: string;
  embryos?: string;
  lawyer?: string;
  company?: string;
  egg_donation?: string;
  sperm_donation?: string;
  status?: string;
  surrogate?: any;
  first_parent?: any;
  second_parent?: any;
  managers?: Array<{ id: string; name: string }>;
};

type SurrogateApplication = {
  full_name?: string;
  phone?: string;
  form_data?: string;
  status?: string;
  created_at?: string;
};

type MedicalInfo = {
  ivf_clinic_name?: string;
  ivf_clinic_doctor_name?: string;
  ivf_clinic_address?: string;
  ivf_clinic_phone?: string;
  obgyn_doctor_name?: string;
  obgyn_clinic_name?: string;
  obgyn_clinic_address?: string;
  obgyn_clinic_phone?: string;
  delivery_hospital_name?: string;
  delivery_hospital_address?: string;
  delivery_hospital_phone?: string;
};

export default function StepStatusPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [adminUpdate, setAdminUpdate] = useState('');
  const [updates, setUpdates] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [postLikes, setPostLikes] = useState<any[]>([]);
  const [medicalReports, setMedicalReports] = useState<any[]>([]);
  const [obAppointments, setObAppointments] = useState<any[]>([]);
  const [ivfAppointments, setIvfAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surrogateApp, setSurrogateApp] = useState<SurrogateApplication | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);

  const [updateTab, setUpdateTab] = useState<'note' | 'medical'>('note');
  const [medicalStage, setMedicalStage] = useState('Pre-Transfer');
  const [medicalVisitDate, setMedicalVisitDate] = useState('');
  const [medicalProviderName, setMedicalProviderName] = useState('');
  const [savingMedical, setSavingMedical] = useState(false);
  const [selectedMedicalReport, setSelectedMedicalReport] = useState<any | null>(null);

  useEffect(() => {
    if (caseId) {
      loadData();
    }
  }, [caseId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, updatesRes] = await Promise.all([
        fetch(`/api/cases/${caseId}`),
        fetch(`/api/cases/${caseId}/updates`),
      ]);

      if (!caseRes.ok) throw new Error('Failed to load case');

      const caseDataRes = await caseRes.json();
      const updatesData = updatesRes.ok ? await updatesRes.json() : { updates: [] };

      setCaseData(caseDataRes.case);
      setUpdates(updatesData.updates || []);

      // Load surrogate application if surrogate exists
      if (caseDataRes.case?.surrogate_id) {
        try {
          const appRes = await fetch(`/api/applications?user_id=${caseDataRes.case.surrogate_id}`);
          if (appRes.ok) {
            const appData = await appRes.json();
            if (appData.data && appData.data.length > 0) {
              setSurrogateApp(appData.data[0]);
              if (appData.data[0].form_data) {
                try {
                  setFormData(JSON.parse(appData.data[0].form_data));
                } catch (e) {
                  console.error('Error parsing form_data:', e);
                }
              }
            }
          }
        } catch (e) {
          console.error('Error loading surrogate application:', e);
        }

        // Load medical info
        try {
          const medRes = await fetch(`/api/surrogate-medical-info?user_id=${caseDataRes.case.surrogate_id}`);
          if (medRes.ok) {
            const medData = await medRes.json();
            setMedicalInfo(medData.data);
          }
        } catch (e) {
          console.error('Error loading medical info:', e);
        }

        // Load activity data (posts, comments, likes, medical reports, appointments)
        // We'll load this data from the matches/options API which already has this data
        try {
          const activityRes = await fetch('/api/matches/options');
          if (activityRes.ok) {
            const activityData = await activityRes.json();
            const allPosts = activityData.posts || [];
            const allComments = activityData.comments || [];
            const allLikes = activityData.postLikes || [];
            const allReports = activityData.medicalReports || [];
            const allOBAppointments = activityData.obAppointments || [];
            const allIVFAppointments = activityData.ivfAppointments || [];
            
            // Filter by surrogate_id
            const surrogatePosts = allPosts.filter((p: any) => p.user_id === caseDataRes.case.surrogate_id);
            const postIds = surrogatePosts.map((p: any) => p.id).filter(Boolean);
            const surrogateComments = allComments.filter((c: any) => postIds.includes(c.post_id));
            const surrogateLikes = allLikes.filter((l: any) => postIds.includes(l.post_id));
            const surrogateReports = allReports.filter((r: any) => r.user_id === caseDataRes.case.surrogate_id);
            const surrogateOBAppointments = allOBAppointments.filter((a: any) => a.user_id === caseDataRes.case.surrogate_id);
            const surrogateIVFAppointments = allIVFAppointments.filter((a: any) => a.user_id === caseDataRes.case.surrogate_id);
            
            setPosts(surrogatePosts);
            setComments(surrogateComments);
            setPostLikes(surrogateLikes);
            setMedicalReports(surrogateReports);
            setObAppointments(surrogateOBAppointments);
            setIvfAppointments(surrogateIVFAppointments);
          }
        } catch (e) {
          console.error('Error loading activity data:', e);
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${month}/${day}/${year}`;
      }
      return new Date(dateStr).toLocaleDateString('en-US');
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${month}/${day}/${year}`;
      }
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

  // Calculate estimated due date from transfer date if not available
  const calculateEstimatedDueDate = () => {
    // First check if estimated_due_date or due_date is already set
    if (caseData?.estimated_due_date) return formatDate(caseData.estimated_due_date);
    if (caseData?.due_date) return formatDate(caseData.due_date);
    
    // Otherwise, calculate from transfer_date
    const transferDate = caseData?.transfer_date;
    if (!transferDate) return '—';
    
    try {
      const dateMatch = transferDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      let transfer: Date;
      
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        transfer = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        transfer = new Date(transferDate);
        transfer.setHours(0, 0, 0, 0);
      }
      
      // Day 5 embryo = 19 days gestational at transfer (14+5)
      // Normal pregnancy is 280 days (40 weeks)
      // So from transfer date, we need 280 - 19 = 261 days to reach full term
      const daysToAdd = 261;
      const dueDate = new Date(transfer);
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      
      return `${(dueDate.getMonth() + 1).toString().padStart(2, '0')}/${dueDate.getDate().toString().padStart(2, '0')}/${dueDate.getFullYear()}`;
    } catch {
      return '—';
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const saveAdminUpdate = async () => {
    if (!adminUpdate.trim()) {
      alert('Please enter an update');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_type: 'admin_note',
          title: 'Admin Update',
          content: adminUpdate,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save update');
      }

      setAdminUpdate('');
      await loadData();
      alert('Update saved successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to save update');
    } finally {
      setSaving(false);
    }
  };

  const deleteAdminUpdate = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) {
      return;
    }

    try {
      const res = await fetch(`/api/cases/${caseId}/updates/${updateId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete update');
      }

      await loadData();
      alert('Update deleted successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to delete update');
    }
  };

  const saveMedicalCheckIn = async () => {
    if (!caseData?.surrogate_id) {
      alert('No surrogate assigned to this case');
      return;
    }
    if (!medicalVisitDate) {
      alert('Please select a visit date');
      return;
    }

    setSavingMedical(true);
    try {
      const res = await fetch('/api/matches/medical-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surrogate_id: caseData.surrogate_id,
          stage: medicalStage,
          visit_date: medicalVisitDate,
          provider_name: medicalProviderName,
          proof_image_url: null, // Admin basic upload doesn't require proof image for now, or it could be added if needed
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save medical check in');
      }

      setMedicalVisitDate('');
      setMedicalProviderName('');
      await loadData();
      alert('Medical check in saved successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to save medical check in');
    } finally {
      setSavingMedical(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading case document...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">{error || 'Case not found'}</div>
          </div>
          <Link href="/matches" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            ← Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  const renderDocumentSection = (title: string, icon: string, children: React.ReactNode) => (
    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  const renderField = (label: string, value: any, highlight?: boolean) => (
    <div className={`flex justify-between py-2 border-b border-gray-100 ${highlight ? 'bg-yellow-50 -mx-2 px-2' : ''}`}>
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm ${highlight ? 'font-semibold text-purple-700' : 'text-gray-900'}`}>
        {formatValue(value)}
      </span>
    </div>
  );

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-8 rounded-lg mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Link href="/matches" className="text-purple-200 hover:text-white text-sm">
              ← Back to Matches
            </Link>
            <span className="bg-white/20 px-3 py-1 rounded text-sm">
              Case ID: {caseData?.claim_id || caseId.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">📋 Case Document</h1>
          <p className="text-purple-200">Complete case overview and status tracking</p>
        </div>

        {/* Case Summary */}
            {renderDocumentSection('Case Summary', '📊',
              <div className="grid grid-cols-2 gap-x-8">
                {renderField('Case Status', caseData?.status?.toUpperCase() || 'ACTIVE', true)}
                {renderField('Current Step', caseData?.current_step ? (STAGE_LABELS[caseData.current_step] || caseData.current_step) : undefined)}
                {renderField('Case Type', caseData?.case_type)}
                {renderField('Weeks Pregnant', caseData?.weeks_pregnant)}
                {renderField('Number of Fetuses', caseData?.number_of_fetuses)}
                {renderField('Fetal Beat Confirm', caseData?.fetal_beat_confirm)}
              </div>
            )}

            {/* Important Dates */}
            {renderDocumentSection('Important Dates', '📅',
              <div className="grid grid-cols-2 gap-x-8">
                {renderField('Sign Date', formatDate(caseData?.sign_date))}
                {renderField('Transfer Date', formatDate(caseData?.transfer_date))}
                {renderField('Beta Confirm Date', formatDate(caseData?.beta_confirm_date))}
                {renderField('Estimated Due Date', calculateEstimatedDueDate(), true)}
              </div>
            )}

            {/* Surrogate Information */}
            {renderDocumentSection('Surrogate Information', '👩',
              <>
                <div className="grid grid-cols-2 gap-x-8">
                  {renderField('Name', caseData?.surrogate?.name || formData.fullName)}
                  {renderField('Phone', caseData?.surrogate?.phone || formData.phoneNumber)}
                  {renderField('Email', caseData?.surrogate?.email || formData.email)}
                  {renderField('Location', caseData?.surrogate?.location)}
                  {renderField('Address', formData.address || formData.applicantAddress)}
                  {renderField('Date of Birth', formData.dateOfBirth)}
                  {renderField('Age', formData.age)}
                  {renderField('Blood Type', formData.bloodType)}
                  {renderField('Height', formData.height)}
                  {renderField('Weight', formData.weight)}
                  {renderField('Race/Ethnicity', formData.race)}
                  {renderField('Marital Status', formData.maritalStatus)}
                  {renderField('Previous Surrogacy', formData.previousSurrogacy)}
                  {renderField('Previous Surrogacy Count', formData.previousSurrogacyCount)}
                </div>
                {surrogateApp && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      Application Status: <span className="font-medium text-green-600">{surrogateApp.status?.toUpperCase()}</span>
                      {surrogateApp.created_at && ` • Submitted: ${formatDate(surrogateApp.created_at)}`}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Surrogate Health & Pregnancy History */}
            {renderDocumentSection('Surrogate Health & History', '🏥',
              <div className="grid grid-cols-2 gap-x-8">
                {renderField('Total Deliveries', formData.totalDeliveries)}
                {renderField('Previous Surrogacy', formData.previousSurrogacy)}
                {renderField('Health Insurance', formData.healthInsurance)}
                {renderField('Maternity Coverage', formData.maternityCoverage)}
                {renderField('Abnormal Pap Smear', formData.abnormalPapSmear)}
                {renderField('Infertility Doctor', formData.infertilityDoctor)}
                {renderField('Household Marijuana Use', formData.householdMarijuana)}
                {renderField('Pregnancy Problems', formData.pregnancyProblems)}
                {renderField('Children Health Problems', formData.childrenHealthProblems)}
                {renderField('Currently Breastfeeding', formData.breastfeeding)}
                {renderField('Tattoos/Piercings (Last 1.5 years)', formData.tattoosPiercings)}
                {renderField('Depression Medication', formData.depressionMedication)}
                {renderField('Drug/Alcohol Abuse', formData.drugAlcoholAbuse)}
                {renderField('Excess Heat Exposure', formData.excessHeat)}
                {renderField('Alcohol Limit Advised', formData.alcoholLimitAdvised)}
                {renderField('Smoking Status', formData.smokingStatus)}
                {renderField('Alcohol Usage', formData.alcoholUsage)}
                {renderField('Mental Health Treatment', formData.mentalHealthTreatment)}
                {renderField('Postpartum Depression', formData.postpartumDepression)}
              </div>
            )}

            {/* Medical Providers */}
            {medicalInfo && (
              renderDocumentSection('Medical Providers', '⚕️',
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">IVF Clinic</h4>
                    <div className="grid grid-cols-2 gap-x-8 bg-gray-50 p-4 rounded">
                      {renderField('Clinic Name', medicalInfo.ivf_clinic_name)}
                      {renderField('Doctor', medicalInfo.ivf_clinic_doctor_name)}
                      {renderField('Address', medicalInfo.ivf_clinic_address)}
                      {renderField('Phone', medicalInfo.ivf_clinic_phone)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">OB/GYN</h4>
                    <div className="grid grid-cols-2 gap-x-8 bg-gray-50 p-4 rounded">
                      {renderField('Doctor', medicalInfo.obgyn_doctor_name)}
                      {renderField('Clinic', medicalInfo.obgyn_clinic_name)}
                      {renderField('Address', medicalInfo.obgyn_clinic_address)}
                      {renderField('Phone', medicalInfo.obgyn_clinic_phone)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Delivery Hospital</h4>
                    <div className="grid grid-cols-2 gap-x-8 bg-gray-50 p-4 rounded">
                      {renderField('Hospital', medicalInfo.delivery_hospital_name)}
                      {renderField('Address', medicalInfo.delivery_hospital_address)}
                      {renderField('Phone', medicalInfo.delivery_hospital_phone)}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Parent Information */}
            {renderDocumentSection('Intended Parents', '👨‍👩‍👧',
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium text-blue-800 mb-3">Parent 1</h4>
                  {renderField('Name', caseData?.first_parent?.name)}
                  {renderField('Phone', caseData?.first_parent?.phone)}
                  {renderField('Email', caseData?.first_parent?.email)}
                  {renderField('Location', caseData?.first_parent?.location)}
                </div>
                <div className="bg-pink-50 p-4 rounded">
                  <h4 className="font-medium text-pink-800 mb-3">Parent 2</h4>
                  {renderField('Name', caseData?.second_parent?.name)}
                  {renderField('Phone', caseData?.second_parent?.phone)}
                  {renderField('Email', caseData?.second_parent?.email)}
                  {renderField('Location', caseData?.second_parent?.location)}
                </div>
              </div>
            )}

            {/* Case Details */}
            {renderDocumentSection('Case Details', '📝',
              <div className="grid grid-cols-2 gap-x-8">
                {renderField('Clinic', caseData?.clinic)}
                {renderField('Lawyer', caseData?.lawyer)}
                {renderField('Escrow', caseData?.company)}
                {renderField('Embryos', caseData?.embryos)}
                {renderField('Egg Donation', caseData?.egg_donation)}
                {renderField('Sperm Donation', caseData?.sperm_donation)}
              </div>
            )}

            {/* Case Managers */}
            {caseData?.managers && caseData.managers.length > 0 && (
              renderDocumentSection('Case Managers', '👥',
                <div className="flex flex-wrap gap-2">
                  {caseData.managers.map((manager) => (
                    <span key={manager.id} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                      {manager.name}
                    </span>
                  ))}
                </div>
              )
            )}

            {/* Surrogate Preferences */}
            {(formData.sameSexCouple !== undefined || formData.carryTwins !== undefined) && (
              renderDocumentSection('Surrogate Preferences', '💭',
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-3 rounded text-center ${formData.sameSexCouple ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.sameSexCouple ? '✓' : '✗'}</div>
                    <div className="text-xs">Same Sex Couple</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.singleMale ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.singleMale ? '✓' : '✗'}</div>
                    <div className="text-xs">Single Male</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.singleFemale ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.singleFemale ? '✓' : '✗'}</div>
                    <div className="text-xs">Single Female</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.internationalCouple ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.internationalCouple ? '✓' : '✗'}</div>
                    <div className="text-xs">International</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.carryTwins ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.carryTwins ? '✓' : '✗'}</div>
                    <div className="text-xs">Carry Twins</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.parentsInDeliveryRoom ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.parentsInDeliveryRoom ? '✓' : '✗'}</div>
                    <div className="text-xs">Parents in Delivery</div>
                  </div>
                </div>
              )
            )}

            {/* Activity Section */}
            {caseData?.surrogate_id && (() => {
              const surrogatePosts = posts.filter((p) => p.user_id === caseData.surrogate_id);
              const latestPosts = surrogatePosts.slice(0, 3);
              const commentCount = comments.filter((c) => surrogatePosts.some((p) => p.id === c.post_id)).length;
              const likeCount = postLikes.filter((l) => surrogatePosts.some((p) => p.id === l.post_id)).length;
              const surrogateReports = medicalReports.filter((r) => r.user_id === caseData.surrogate_id);
              const latestReports = surrogateReports.slice(0, 3);

              return renderDocumentSection('Activity', '📊',
                <div className="space-y-4">
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
                                  onClick={() => setSelectedMedicalReport(r)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                  title="View detailed medical report"
                                >
                                  👁️ View Details
                                </button>
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
                      const upcomingOBAppointments = obAppointments
                        .filter((a) => a.status === 'scheduled')
                        .slice(0, 5);
                      const upcomingIVFAppointments = ivfAppointments
                        .filter((a) => a.status === 'scheduled')
                        .slice(0, 5);
                      
                      return (
                        <>
                          <div className="font-semibold text-sm text-blue-700 mb-2">
                            OB Appointments: {obAppointments.length} total ({obAppointments.filter(a => a.status === 'scheduled').length} scheduled)
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
                            IVF Appointments: {ivfAppointments.length} total ({ivfAppointments.filter(a => a.status === 'scheduled').length} scheduled)
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
              );
            })()}
          {/* Admin Updates Section */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Updates:</h2>
          
          {/* Display existing updates */}
          {updates.length > 0 && (
            <div className="mb-6 space-y-4">
              {updates
                .filter((update: any) => update.update_type === 'admin_note')
                .map((update: any) => (
                  <div key={update.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{update.title || 'Admin Update'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {update.created_at ? new Date(update.created_at).toLocaleString('en-US') : '—'}
                          {update.updated_by_user?.name && ` • By ${update.updated_by_user.name}`}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAdminUpdate(update.id)}
                        className="ml-4 px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete this update"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{update.content}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Add new update / medical check in */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setUpdateTab('note')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  updateTab === 'note'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Add Admin Note
              </button>
              <button
                onClick={() => setUpdateTab('medical')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  updateTab === 'medical'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Help Upload Medical Check In
              </button>
            </nav>
          </div>

          {updateTab === 'note' ? (
            <>
              <textarea
                value={adminUpdate}
                onChange={(e) => setAdminUpdate(e.target.value)}
                placeholder="Enter admin update notes..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-4">
                <button
                  onClick={saveAdminUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={medicalStage}
                    onChange={(e) => setMedicalStage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pre-Transfer">Pre-Transfer</option>
                    <option value="Post-Transfer">Post-Transfer</option>
                    <option value="OBGYN">OBGYN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={medicalVisitDate}
                    onChange={(e) => setMedicalVisitDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name (Optional)</label>
                  <input
                    type="text"
                    value={medicalProviderName}
                    onChange={(e) => setMedicalProviderName(e.target.value)}
                    placeholder="Enter doctor or clinic name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={saveMedicalCheckIn}
                  disabled={savingMedical}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {savingMedical ? 'Saving...' : 'Save Medical Check In'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm py-6">
          Generated on {new Date().toLocaleString('en-US')} • Babytree Surrogacy
        </div>
      </div>

      {/* Detail Modal */}
      {selectedMedicalReport && renderMedicalReportDetailModal(
        selectedMedicalReport, 
        () => setSelectedMedicalReport(null),
        formatDateOnly
      )}
    </div>
  );
}

const renderMedicalReportDetailModal = (
  report: any,
  onClose: () => void,
  formatDateOnly: (dateStr: string | null | undefined) => string
) => {
  if (!report) return null;

  const reportDataLabelMap: Record<string, string> = {
    endometrial_thickness: 'Endometrial Thickness',
    follicle_1_mm: 'Follicle 1 (mm)',
    follicle_2_mm: 'Follicle 2 (mm)',
    follicle_3_mm: 'Follicle 3 (mm)',
    labs: 'Labs',
    labs_other: 'Other Labs',
    next_appointment_date: 'Next Appt Date',
    next_appointment_type: 'Next Appt Type',
    questions_for_team: 'Questions',
    gestational_sac_diameter: 'Gestational Sac Diameter (mm)',
    fetal_heart_rate: 'Fetal Heart Rate (bpm)',
    beta_hcg: 'Beta hCG',
    weight: 'Weight',
    blood_pressure: 'Blood Pressure',
    fetal_heartbeats: 'Fetal Heartbeats',
    fundal_height: 'Fundal Height',
    cervix_length: 'Cervix Length',
    urine_test_results: 'Urine Test Results',
    other_concerns: 'Other Concerns',
  };

  const reportData = report.report_data || {};
  const dataKeys = Object.keys(reportData).filter(key => {
    const val = reportData[key];
    return val !== null && val !== undefined && val !== '';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto pt-10 pb-10">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-auto flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Medical Check-in Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Stage</span>
                <span className="block text-sm font-medium text-gray-900 mt-1">{report.stage}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Visit Date</span>
                <span className="block text-sm font-medium text-gray-900 mt-1">{formatDateOnly(report.visit_date)}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Provider</span>
                <span className="block text-sm font-medium text-gray-900 mt-1">{report.provider_name || '—'}</span>
              </div>
              {report.provider_contact && (
                <div>
                  <span className="block text-xs font-semibold text-gray-500 uppercase">Provider Contact</span>
                  <span className="block text-sm font-medium text-gray-900 mt-1">{report.provider_contact}</span>
                </div>
              )}
            </div>
          </div>

          <h4 className="font-semibold text-md text-gray-800 border-b border-gray-200 pb-2 mb-4">Report Data</h4>
          
          {dataKeys.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No additional report data provided.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {dataKeys.map((key) => {
                let value = reportData[key];
                if (Array.isArray(value)) {
                  value = value.join(', ');
                } else if (typeof value === 'object') {
                  value = JSON.stringify(value);
                }
                const label = reportDataLabelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                return (
                  <div key={key} className="break-words">
                    <span className="block text-xs font-semibold text-gray-500">{label}</span>
                    <span className="block text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{value}</span>
                  </div>
                );
              })}
            </div>
          )}

          {report.proof_image_url && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-sm text-gray-800 mb-2">Proof Image</h4>
              <a 
                href={report.proof_image_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                📎 View Uploaded Document/Image
              </a>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 shrink-0 text-right bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
