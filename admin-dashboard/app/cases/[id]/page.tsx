'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface MatchData {
  id: string;
  surrogate_id: string;
  parent_id: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  claim_id?: string;
  case_type?: string;
  first_parent_id?: string;
  first_parent_name?: string;
  second_parent_name?: string;
  progress_stage?: string;
  progress_stage_updated_by?: string;
  progress_stage_updated_at?: string;
  sign_date?: string;
  transfer_date?: string;
  beta_confirm_date?: string;
  fetal_beat?: string;
  clinic?: string;
  number_of_embryos?: string;
  lawyer?: string;
  company?: string;
  egg_donation?: string;
  sperm_donation?: string;
  branch_id?: string;
}

interface Profile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  address?: string;
  role: string;
}

interface MedicalInfo {
  ivf_clinic_name?: string;
  ivf_clinic_doctor_name?: string;
  ivf_clinic_address?: string;
  ivf_clinic_phone?: string;
  ivf_clinic_email?: string;
  obgyn_doctor_name?: string;
  obgyn_clinic_name?: string;
  obgyn_clinic_address?: string;
  obgyn_clinic_phone?: string;
  obgyn_clinic_email?: string;
  delivery_hospital_name?: string;
  delivery_hospital_address?: string;
  delivery_hospital_phone?: string;
  delivery_hospital_email?: string;
}

interface ApplicationData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  age?: string;
  address?: string;
  location?: string;
  phoneNumber?: string;
  email?: string;
  bloodType?: string;
  height?: string;
  weight?: string;
  maritalStatus?: string;
  spouseName?: string;
  employmentStatus?: string;
  occupation?: string;
  monthlyIncome?: string;
  previousPregnancies?: string;
  previousSurrogacy?: boolean;
  previousSurrogacyCount?: string;
  totalDeliveries?: string;
  deliveries?: any[];
  // Health info
  generalHealth?: string;
  currentMedications?: string;
  allergies?: string;
  mentalHealthHistory?: string;
  // Preferences
  willingToTerminate?: string;
  willingToReduceMultiples?: string;
  comfortWithGayParents?: string;
  comfortWithSingleParent?: string;
  travelWillingness?: string;
}

const STAGE_LABELS: Record<string, string> = {
  'pre': 'Pre-Match',
  'medical_review': 'Medical Review',
  'legal_contracts': 'Legal Contracts',
  'ivf_prep': 'IVF Preparation',
  'embryo_transfer': 'Embryo Transfer',
  'pregnancy_confirmed': 'Pregnancy Confirmed',
  'first_trimester': '1st Trimester',
  'second_trimester': '2nd Trimester',
  'third_trimester': '3rd Trimester',
  'delivery': 'Delivery',
  'post_birth': 'Post Birth',
  'completed': 'Completed',
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [surrogateProfile, setSurrogateProfile] = useState<Profile | null>(null);
  const [parentProfile, setParentProfile] = useState<Profile | null>(null);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, [matchId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load match data
      const matchRes = await fetch(`/api/matches/options`);
      if (!matchRes.ok) throw new Error('Failed to load match data');
      const matchesData = await matchRes.json();
      
      const match = matchesData.matches?.find((m: any) => m.id === matchId);
      if (!match) throw new Error('Match not found');
      setMatchData(match);

      // Find profiles
      const surrogate = matchesData.profiles?.find((p: any) => p.id === match.surrogate_id);
      const parent = matchesData.profiles?.find((p: any) => p.id === match.parent_id);
      setSurrogateProfile(surrogate || null);
      setParentProfile(parent || null);

      // Load surrogate medical info
      if (match.surrogate_id) {
        try {
          const medRes = await fetch(`/api/surrogate-medical-info?user_id=${match.surrogate_id}`);
          if (medRes.ok) {
            const medData = await medRes.json();
            setMedicalInfo(medData.data || null);
          }
        } catch (e) {
          console.error('Error loading medical info:', e);
        }
      }

      // Load surrogate application data
      if (match.surrogate_id) {
        try {
          const appRes = await fetch(`/api/applications?user_id=${match.surrogate_id}`);
          if (appRes.ok) {
            const appData = await appRes.json();
            if (appData.data?.form_data) {
              try {
                const parsed = JSON.parse(appData.data.form_data);
                setApplicationData(parsed);
              } catch (e) {
                console.error('Error parsing application data:', e);
              }
            }
          }
        } catch (e) {
          console.error('Error loading application:', e);
        }
      }

      // Load contracts
      try {
        const contractsRes = await fetch(`/api/contracts?match_id=${matchId}`);
        if (contractsRes.ok) {
          const contractsData = await contractsRes.json();
          setContracts(contractsData.contracts || []);
        }
      } catch (e) {
        console.error('Error loading contracts:', e);
      }

      // Load managers
      if (match.managers) {
        setManagers(match.managers);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading case details...</div>
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">{error || 'Case not found'}</div>
          <Link href="/matches" className="text-blue-600 hover:underline">
            ← Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/matches" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
              ← Back to Matches
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Case Detail: {matchData.claim_id || `MATCH-${matchData.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                matchData.status === 'active' ? 'bg-green-100 text-green-800' :
                matchData.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {matchData.status?.toUpperCase()}
              </span>
              <span className="text-gray-500">
                Created: {formatDate(matchData.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
          >
            🖨️ Print
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Case Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">📋 Case Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-500">Case ID</div>
                <div className="font-medium">{matchData.claim_id || `MATCH-${matchData.id.slice(0, 8).toUpperCase()}`}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-medium">{matchData.status?.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Current Stage</div>
                <div className="font-medium text-blue-600">
                  {STAGE_LABELS[matchData.progress_stage || ''] || matchData.progress_stage || 'Pre-Match'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-medium">{formatDate(matchData.created_at)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Last Updated</div>
                <div className="font-medium">{formatDate(matchData.updated_at)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Case Managers</div>
                <div className="font-medium">
                  {managers.length > 0 ? managers.map(m => m.name).join(', ') : '—'}
                </div>
              </div>
            </div>
            {matchData.notes && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Notes</div>
                <div className="text-gray-700">{matchData.notes}</div>
              </div>
            )}
          </div>

          {/* Surrogate Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">👩 Surrogate Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium">{surrogateProfile?.name || applicationData?.fullName || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="font-medium">{surrogateProfile?.phone || applicationData?.phoneNumber || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{surrogateProfile?.email || applicationData?.email || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Location</div>
                <div className="font-medium">{surrogateProfile?.location || applicationData?.location || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Full Address</div>
                <div className="font-medium">{surrogateProfile?.address || applicationData?.address || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Date of Birth</div>
                <div className="font-medium">{applicationData?.dateOfBirth || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Age</div>
                <div className="font-medium">{applicationData?.age || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Blood Type</div>
                <div className="font-medium">{applicationData?.bloodType || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Height</div>
                <div className="font-medium">{applicationData?.height || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Weight</div>
                <div className="font-medium">{applicationData?.weight || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Marital Status</div>
                <div className="font-medium">{applicationData?.maritalStatus || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Spouse Name</div>
                <div className="font-medium">{applicationData?.spouseName || '—'}</div>
              </div>
            </div>

            {/* Employment */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Employment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium">{applicationData?.employmentStatus || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Occupation</div>
                  <div className="font-medium">{applicationData?.occupation || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Monthly Income</div>
                  <div className="font-medium">{applicationData?.monthlyIncome ? `$${applicationData.monthlyIncome}` : '—'}</div>
                </div>
              </div>
            </div>

            {/* Pregnancy History */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Pregnancy History</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Previous Pregnancies</div>
                  <div className="font-medium">{applicationData?.previousPregnancies || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Deliveries</div>
                  <div className="font-medium">{applicationData?.totalDeliveries || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Previous Surrogacy</div>
                  <div className="font-medium">{applicationData?.previousSurrogacy ? `Yes (${applicationData.previousSurrogacyCount || 1} time(s))` : 'No'}</div>
                </div>
              </div>
              {applicationData?.deliveries && applicationData.deliveries.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-500 mb-2">Delivery Records</div>
                  <div className="space-y-2">
                    {applicationData.deliveries.map((d: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="font-medium">Delivery {idx + 1}: {d.deliveryDate || '—'}</div>
                        <div className="text-gray-600">
                          Type: {d.deliveryType || '—'} | Weight: {d.birthWeight || '—'} | 
                          Weeks: {d.weeksAtDelivery || '—'} | Complications: {d.complications || 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Health Info */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Health Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">General Health</div>
                  <div className="font-medium">{applicationData?.generalHealth || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Current Medications</div>
                  <div className="font-medium">{applicationData?.currentMedications || 'None'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Allergies</div>
                  <div className="font-medium">{applicationData?.allergies || 'None'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Mental Health History</div>
                  <div className="font-medium">{applicationData?.mentalHealthHistory || '—'}</div>
                </div>
              </div>
            </div>

            {/* Surrogate Preferences */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Surrogate Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Willing to Terminate</div>
                  <div className="font-medium">{applicationData?.willingToTerminate || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Willing to Reduce Multiples</div>
                  <div className="font-medium">{applicationData?.willingToReduceMultiples || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Comfort with Gay Parents</div>
                  <div className="font-medium">{applicationData?.comfortWithGayParents || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Comfort with Single Parent</div>
                  <div className="font-medium">{applicationData?.comfortWithSingleParent || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Travel Willingness</div>
                  <div className="font-medium">{applicationData?.travelWillingness || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Intended Parents Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">👨‍👩‍👧 Intended Parents Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">Parent 1</h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium">{matchData.first_parent_name || parentProfile?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium">{parentProfile?.phone || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium">{parentProfile?.email || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-medium">{parentProfile?.location || '—'}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-3">Parent 2</h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium">{matchData.second_parent_name || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Providers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">🏥 Medical Providers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* IVF Clinic */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">IVF Clinic</h3>
                {medicalInfo?.ivf_clinic_name ? (
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500">Name:</span> {medicalInfo.ivf_clinic_name}</div>
                    {medicalInfo.ivf_clinic_doctor_name && <div><span className="text-gray-500">Doctor:</span> {medicalInfo.ivf_clinic_doctor_name}</div>}
                    {medicalInfo.ivf_clinic_address && <div><span className="text-gray-500">Address:</span> {medicalInfo.ivf_clinic_address}</div>}
                    {medicalInfo.ivf_clinic_phone && <div><span className="text-gray-500">Phone:</span> {medicalInfo.ivf_clinic_phone}</div>}
                    {medicalInfo.ivf_clinic_email && <div><span className="text-gray-500">Email:</span> {medicalInfo.ivf_clinic_email}</div>}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Not provided</div>
                )}
              </div>

              {/* OB/GYN */}
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">OB/GYN Doctor</h3>
                {medicalInfo?.obgyn_doctor_name || medicalInfo?.obgyn_clinic_name ? (
                  <div className="space-y-2 text-sm">
                    {medicalInfo.obgyn_doctor_name && <div><span className="text-gray-500">Doctor:</span> Dr. {medicalInfo.obgyn_doctor_name}</div>}
                    {medicalInfo.obgyn_clinic_name && <div><span className="text-gray-500">Clinic:</span> {medicalInfo.obgyn_clinic_name}</div>}
                    {medicalInfo.obgyn_clinic_address && <div><span className="text-gray-500">Address:</span> {medicalInfo.obgyn_clinic_address}</div>}
                    {medicalInfo.obgyn_clinic_phone && <div><span className="text-gray-500">Phone:</span> {medicalInfo.obgyn_clinic_phone}</div>}
                    {medicalInfo.obgyn_clinic_email && <div><span className="text-gray-500">Email:</span> {medicalInfo.obgyn_clinic_email}</div>}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Not provided</div>
                )}
              </div>

              {/* Delivery Hospital */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-3">Delivery Hospital</h3>
                {medicalInfo?.delivery_hospital_name ? (
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500">Name:</span> {medicalInfo.delivery_hospital_name}</div>
                    {medicalInfo.delivery_hospital_address && <div><span className="text-gray-500">Address:</span> {medicalInfo.delivery_hospital_address}</div>}
                    {medicalInfo.delivery_hospital_phone && <div><span className="text-gray-500">Phone:</span> {medicalInfo.delivery_hospital_phone}</div>}
                    {medicalInfo.delivery_hospital_email && <div><span className="text-gray-500">Email:</span> {medicalInfo.delivery_hospital_email}</div>}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Not provided</div>
                )}
              </div>
            </div>

            {/* Case-level medical info */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Case Medical Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Clinic (Case)</div>
                  <div className="font-medium">{matchData.clinic || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Number of Embryos</div>
                  <div className="font-medium">{matchData.number_of_embryos || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Fetal Beat</div>
                  <div className="font-medium">{matchData.fetal_beat || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Egg Donation</div>
                  <div className="font-medium">{matchData.egg_donation || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Sperm Donation</div>
                  <div className="font-medium">{matchData.sperm_donation || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Dates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">📅 Important Dates</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500 mb-1">Sign Date</div>
                <div className="font-semibold text-lg">{formatDate(matchData.sign_date)}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500 mb-1">Transfer Date</div>
                <div className="font-semibold text-lg">{formatDate(matchData.transfer_date)}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500 mb-1">Beta Confirm Date</div>
                <div className="font-semibold text-lg">{formatDate(matchData.beta_confirm_date)}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500 mb-1">Stage Updated</div>
                <div className="font-semibold text-lg">{formatDate(matchData.progress_stage_updated_at)}</div>
              </div>
            </div>
          </div>

          {/* Legal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">⚖️ Legal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500">Lawyer</div>
                <div className="font-medium">{matchData.lawyer || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Company</div>
                <div className="font-medium">{matchData.company || '—'}</div>
              </div>
            </div>

            {/* Contracts */}
            {contracts.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Contracts</h3>
                <div className="space-y-2">
                  {contracts.map((contract: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{contract.document_type}</div>
                        <div className="text-sm text-gray-500">Uploaded: {formatDate(contract.created_at)}</div>
                      </div>
                      {contract.file_url && (
                        <a
                          href={contract.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Progress Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">📈 Progress Timeline</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STAGE_LABELS).map(([key, label]) => {
                const isCurrentStage = matchData.progress_stage === key;
                const stageIndex = Object.keys(STAGE_LABELS).indexOf(key);
                const currentIndex = Object.keys(STAGE_LABELS).indexOf(matchData.progress_stage || 'pre');
                const isPastStage = stageIndex < currentIndex;

                return (
                  <div
                    key={key}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      isCurrentStage
                        ? 'bg-blue-600 text-white'
                        : isPastStage
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isPastStage && '✓ '}{label}
                  </div>
                );
              })}
            </div>
            {matchData.progress_stage_updated_by && (
              <div className="mt-4 text-sm text-gray-500">
                Last updated by: {matchData.progress_stage_updated_by} on {formatDate(matchData.progress_stage_updated_at)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

