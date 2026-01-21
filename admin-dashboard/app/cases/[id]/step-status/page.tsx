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

type CaseStep = {
  id: string;
  case_id: string;
  stage_number: number;
  stage_name: string;
  step_number: number;
  step_name: string;
  status: string;
  completed_at?: string | null;
  completed_by?: string | null;
  notes?: string | null;
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

const DEFAULT_STAGES = [
  {
    stage_number: 1,
    stage_name: 'Apply to be a surrogate',
    steps: [
      { step_number: 1, step_name: 'Application submitted' },
      { step_number: 2, step_name: 'Interview with agency' },
      { step_number: 3, step_name: 'Collect medical records' },
    ],
  },
  {
    stage_number: 2,
    stage_name: 'Ready for match',
    steps: [
      { step_number: 4, step_name: 'Waiting to be matched' },
    ],
  },
  {
    stage_number: 3,
    stage_name: 'Complete a match',
    steps: [
      { step_number: 5, step_name: 'Video Chat with IP/Surrogate' },
    ],
  },
];

export default function StepStatusPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [steps, setSteps] = useState<CaseStep[]>([]);
  const [adminUpdate, setAdminUpdate] = useState('');
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surrogateApp, setSurrogateApp] = useState<SurrogateApplication | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'steps'>('overview');

  useEffect(() => {
    if (caseId) {
      loadData();
    }
  }, [caseId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, stepsRes, updatesRes] = await Promise.all([
        fetch(`/api/cases/${caseId}`),
        fetch(`/api/cases/${caseId}/steps`),
        fetch(`/api/cases/${caseId}/updates`),
      ]);

      if (!caseRes.ok) throw new Error('Failed to load case');
      if (!stepsRes.ok) throw new Error('Failed to load steps');

      const caseDataRes = await caseRes.json();
      const stepsData = await stepsRes.json();
      const updatesData = updatesRes.ok ? await updatesRes.json() : { updates: [] };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step-status/page.tsx:148',message:'loadData updates response',data:{updatesResOk:updatesRes.ok,updatesResStatus:updatesRes.status,updatesCount:updatesData.updates?.length||0,updates:updatesData.updates},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      setCaseData(caseDataRes.case);
      setSteps(stepsData.steps || []);
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

  const updateStepStatus = async (stageNumber: number, stepNumber: number, status: string) => {
    try {
      const stage = DEFAULT_STAGES.find(s => s.stage_number === stageNumber);
      const step = stage?.steps.find(s => s.step_number === stepNumber);

      const res = await fetch(`/api/cases/${caseId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_number: stageNumber,
          stage_name: stage?.stage_name || `Stage ${stageNumber}`,
          step_number: stepNumber,
          step_name: step?.step_name || `Step ${stepNumber}`,
          status,
        }),
      });

      if (!res.ok) throw new Error('Failed to update step');

      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update step');
    }
  };

  const saveAdminUpdate = async () => {
    if (!adminUpdate.trim()) {
      alert('Please enter an update');
      return;
    }

    setSaving(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step-status/page.tsx:274',message:'saveAdminUpdate called',data:{caseId,adminUpdate:adminUpdate.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const res = await fetch(`/api/cases/${caseId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_type: 'admin_note',
          title: 'Admin Update',
          content: adminUpdate,
        }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step-status/page.tsx:288',message:'saveAdminUpdate response',data:{status:res.status,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!res.ok) {
        const errorText = await res.text();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step-status/page.tsx:293',message:'saveAdminUpdate error response',data:{status:res.status,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        throw new Error('Failed to save update');
      }

      const responseData = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step-status/page.tsx:299',message:'saveAdminUpdate success response',data:{responseData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      setAdminUpdate('');
      await loadData();
      alert('Update saved successfully');
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step-status/page.tsx:305',message:'saveAdminUpdate exception',data:{error:err.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      alert(err.message || 'Failed to save update');
    } finally {
      setSaving(false);
    }
  };

  const getStepStatus = (stageNumber: number, stepNumber: number): string => {
    const step = steps.find(
      s => s.stage_number === stageNumber && s.step_number === stepNumber
    );
    return step?.status || 'pending';
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'skipped':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading step status...</div>
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
          
          {/* Tab Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                activeTab === 'overview' 
                  ? 'bg-white text-purple-700' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📄 Case Overview
            </button>
            <button
              onClick={() => setActiveTab('steps')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                activeTab === 'steps' 
                  ? 'bg-white text-purple-700' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              ✅ Step Status
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
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
          </>
        ) : (
          <>
        {/* Step Status Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Step Status</h2>
          
          {DEFAULT_STAGES.map((stage) => (
            <div key={stage.stage_number} className="mb-6 last:mb-0">
              <div className="bg-gray-100 px-4 py-3 mb-3 rounded">
                <h3 className="font-semibold text-gray-900">{stage.stage_name}</h3>
              </div>
              <div className="border-t border-gray-200 pt-3">
                {stage.steps.map((step) => {
                  const currentStatus = getStepStatus(stage.stage_number, step.step_number);
                  return (
                    <div key={step.step_number} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">
                            Step {step.step_number} {step.step_name}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs border ${getStepStatusColor(currentStatus)}`}>
                            {currentStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStepStatus(stage.stage_number, step.step_number, 'in_progress')}
                            className={`px-3 py-1 text-xs rounded ${
                              currentStatus === 'in_progress'
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => updateStepStatus(stage.stage_number, step.step_number, 'completed')}
                            className={`px-3 py-1 text-xs rounded ${
                              currentStatus === 'completed'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => updateStepStatus(stage.stage_number, step.step_number, 'skipped')}
                            className={`px-3 py-1 text-xs rounded ${
                              currentStatus === 'skipped'
                                ? 'bg-gray-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Admin Updates Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Updates:</h2>
          
          {/* Display existing updates */}
          {/* #region agent log */}
          {(() => {
            const adminNotes = updates.filter((update: any) => update.update_type === 'admin_note');
            fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step-status/page.tsx:673',message:'rendering updates',data:{updatesLength:updates.length,adminNotesCount:adminNotes.length,allUpdates:updates.map((u:any)=>({id:u.id,type:u.update_type,title:u.title}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            return null;
          })()}
          {/* #endregion */}
          {updates.length > 0 && (
            <div className="mb-6 space-y-4">
              {updates
                .filter((update: any) => update.update_type === 'admin_note')
                .map((update: any) => (
                  <div key={update.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{update.title || 'Admin Update'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {update.created_at ? new Date(update.created_at).toLocaleString('en-US') : '—'}
                          {update.updated_by_user?.name && ` • By ${update.updated_by_user.name}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{update.content}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Add new update */}
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
        </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm py-6">
          Generated on {new Date().toLocaleString('en-US')} • Babytree Surrogacy
        </div>
      </div>
    </div>
  );
}
