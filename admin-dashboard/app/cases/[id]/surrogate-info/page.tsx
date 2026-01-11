'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type SurrogateProfile = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  address?: string;
  date_of_birth?: string;
  age?: string;
  race?: string;
  role?: string;
};

type ApplicationData = {
  full_name?: string;
  phone?: string;
  form_data?: string;
  status?: string;
  created_at?: string;
};

export default function SurrogateInfoPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<SurrogateProfile | null>(null);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (caseId) {
      loadSurrogateInfo();
    }
  }, [caseId]);

  const loadSurrogateInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      // First get the case to find surrogate_id
      const caseRes = await fetch(`/api/cases/${caseId}`);
      if (!caseRes.ok) {
        throw new Error('Failed to load case');
      }
      const caseData = await caseRes.json();
      const surrogateId = caseData.case?.surrogate_id;

      if (!surrogateId) {
        setError('No surrogate assigned to this case');
        setLoading(false);
        return;
      }

      // Set profile from case data
      setProfile(caseData.case?.surrogate || null);

      // Load application data
      const appRes = await fetch(`/api/applications?user_id=${surrogateId}`);
      if (appRes.ok) {
        const appData = await appRes.json();
        if (appData.data && appData.data.length > 0) {
          const app = appData.data[0];
          setApplication(app);
          // Parse form_data
          if (app.form_data) {
            try {
              setFormData(JSON.parse(app.form_data));
            } catch (e) {
              console.error('Error parsing form_data:', e);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading surrogate info:', err);
      setError(err.message || 'Failed to load surrogate information');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const renderField = (label: string, value: any) => (
    <div className="py-2 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}:</span>
      <span className="ml-2 text-sm text-gray-900">{formatValue(value)}</span>
    </div>
  );

  const renderSection = (title: string, icon: string, children: React.ReactNode) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading surrogate information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
        <Link href="/matches" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Back to Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/matches" className="text-blue-600 hover:text-blue-800">
          ← Back to Matches
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Surrogate Information - {profile?.name || 'Unknown'}
      </h1>

      {/* Basic Profile */}
      {renderSection('Basic Information', '👤',
        <>
          {renderField('Full Name', profile?.name || formData.fullName)}
          {renderField('First Name', formData.firstName)}
          {renderField('Middle Name', formData.middleName)}
          {renderField('Last Name', formData.lastName)}
          {renderField('Phone', profile?.phone || formData.phoneNumber)}
          {renderField('Email', profile?.email || formData.email)}
          {renderField('Date of Birth', profile?.date_of_birth || formData.dateOfBirth)}
          {renderField('Age', formData.age)}
          {renderField('Location', profile?.location)}
          {renderField('Address', profile?.address || formData.address || formData.applicantAddress)}
          {renderField('Race/Ethnicity', profile?.race || formData.race)}
          {renderField('Blood Type', formData.bloodType)}
          {renderField('Height', formData.height)}
          {renderField('Weight', formData.weight)}
          {renderField('US Citizen', formData.usCitizen)}
          {renderField('Religious Background', formData.religiousBackground)}
          {renderField('Practicing Religion', formData.practicingReligion)}
          {renderField('Hear About Us', formData.hearAboutUs)}
          {renderField('Referral Code', formData.referralCode)}
          {renderField('Siblings Count', formData.siblingsCount)}
          {renderField('Mother Siblings Count', formData.motherSiblingsCount)}
          {renderField('Pets', formData.pets)}
          {renderField('Living Situation', formData.livingSituation)}
          {renderField('Own Car', formData.ownCar)}
          {renderField('Driver License', formData.driverLicense)}
          {renderField('Car Insured', formData.carInsured)}
          {renderField('Transportation Method', formData.transportationMethod)}
          {renderField('Nearest Airport', formData.nearestAirport)}
          {renderField('Airport Distance', formData.airportDistance)}
          {renderField('Legal Problems', formData.legalProblems)}
          {renderField('Jail Time', formData.jailTime)}
          {renderField('Want More Children', formData.wantMoreChildren)}
        </>
      )}

      {/* Marital Status */}
      {renderSection('Marital Status & Family', '💑',
        <>
          {renderField('Marital Status', formData.maritalStatus)}
          {renderField('Are you single?', formData.isSingle === true ? 'Yes' : formData.isSingle === false ? 'No' : 'N/A')}
          {renderField('Are you married?', formData.isMarried === true ? 'Yes' : formData.isMarried === false ? 'No' : 'N/A')}
          {renderField('Are you widowed?', formData.isWidowed === true ? 'Yes' : formData.isWidowed === false ? 'No' : 'N/A')}
          {renderField('Life Partner', formData.lifePartner)}
          {renderField('Engaged', formData.engaged)}
          {renderField('Spouse/Partner Name', formData.spouseName || formData.partnerName)}
          {renderField('Spouse/Partner Date of Birth', formData.spouseDateOfBirth || formData.partnerDateOfBirth)}
          {renderField('Marriage Date', formData.marriageDate)}
          {renderField('Wedding Date', formData.weddingDate)}
          {renderField('Widowed Date', formData.widowedDate)}
          {renderField('Marital Problems', formData.maritalProblems)}
          {renderField('Divorced', formData.divorced)}
          {renderField('Divorce Date', formData.divorceDate)}
          {renderField('Divorce Cause', formData.divorceCause)}
          {renderField('Remarried', formData.remarried)}
          {renderField('Remarried Date', formData.remarriedDate)}
          {renderField('Legally Separated', formData.legallySeparated)}
          {renderField('Separation Details', formData.separationDetails)}
          {renderField('Engagement Date', formData.engagementDate)}
        </>
      )}

      {/* Pregnancy History */}
      {renderSection('Pregnancy & Delivery History', '🤰',
        <>
          {renderField('Total Deliveries', formData.totalDeliveries)}
          {renderField('Previous Surrogacy', formData.previousSurrogacy)}
          {renderField('Previous Surrogacy Count', formData.previousSurrogacyCount)}
          {formData.deliveries && formData.deliveries.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Delivery Records:</p>
              {formData.deliveries.map((delivery: any, index: number) => (
                delivery && (delivery.year || delivery.gender) && (
                  <div key={index} className="bg-gray-50 p-3 rounded mb-2 text-sm">
                    <p className="font-medium">Delivery #{index + 1}</p>
                    <div className="grid grid-cols-4 gap-2 mt-1 text-gray-600">
                      <span>Year: {delivery.year || 'N/A'}</span>
                      <span>Gender: {delivery.gender || 'N/A'}</span>
                      <span>Weight: {delivery.birthWeight || 'N/A'}</span>
                      <span>Method: {delivery.deliveryMethod || 'N/A'}</span>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </>
      )}

      {/* Health Information */}
      {renderSection('Health Information', '🏥',
        <>
          {renderField('Health Insurance', formData.healthInsurance)}
          {renderField('Maternity Coverage', formData.maternityCoverage)}
          {renderField('Insurance Details', formData.insuranceDetails)}
          {renderField('State Agency Insurance', formData.stateAgencyInsurance)}
          {renderField('State Agency Name', formData.stateAgencyName)}
          {renderField('Insurance Payment Method', formData.insurancePaymentMethod)}
          {renderField('Delivery Hospital', formData.deliveryHospital)}
          {renderField('Delivered at Hospital Before', formData.deliveredAtHospitalBefore)}
          {renderField('Abnormal Pap Smear', formData.abnormalPapSmear)}
          {renderField('Monthly Cycles', formData.monthlyCycles)}
          {renderField('Cycle Days', formData.cycleDays)}
          {renderField('Period Days', formData.periodDays)}
          {renderField('Last Menstrual Period', formData.lastMenstrualPeriod)}
          {renderField('Infertility Doctor', formData.infertilityDoctor)}
          {renderField('Infertility Details', formData.infertilityDetails)}
          {renderField('Household Marijuana Use', formData.householdMarijuana)}
          {renderField('Pregnancy Problems', formData.pregnancyProblems)}
          {renderField('Pregnancy Problems Details', formData.pregnancyProblemsDetails)}
          {renderField('Children Health Problems', formData.childrenHealthProblems)}
          {renderField('Children Health Details', formData.childrenHealthDetails)}
          {renderField('Currently Breastfeeding', formData.breastfeeding)}
          {renderField('Breastfeeding Stop Date', formData.breastfeedingStopDate)}
          {renderField('Tattoos/Piercings (Last 1.5 years)', formData.tattoosPiercings)}
          {renderField('Tattoos/Piercings Date', formData.tattoosPiercingsDate)}
          {renderField('Depression Medication', formData.depressionMedication)}
          {renderField('Depression Medication Details', formData.depressionMedicationDetails)}
          {renderField('Drug/Alcohol Abuse', formData.drugAlcoholAbuse)}
          {renderField('Excess Heat Exposure', formData.excessHeat)}
          {renderField('Alcohol Limit Advised', formData.alcoholLimitAdvised)}
          {renderField('Smoking Status', formData.smokingStatus)}
          {renderField('Smoked During Pregnancy', formData.smokedDuringPregnancy)}
          {renderField('Alcohol Usage', formData.alcoholUsage)}
          {renderField('Illegal Drugs', formData.illegalDrugs)}
          {renderField('Mental Health Treatment', formData.mentalHealthTreatment)}
          {renderField('Postpartum Depression', formData.postpartumDepression)}
          {renderField('Hepatitis B Vaccinated', formData.hepatitisBVaccinated)}
          {renderField('Allergies', formData.allergies)}
          {renderField('Current Medications', formData.currentMedications)}
          {renderField('Children List', formData.childrenList)}
        </>
      )}

      {/* Sexual History */}
      {renderSection('Sexual History', '💕',
        <>
          {renderField('Past Contraceptives', formData.pastContraceptives)}
          {renderField('STD History', formData.stdHistory)}
          {renderField('STD Details', formData.stdDetails)}
        </>
      )}

      {/* Employment & Education */}
      {renderSection('Employment & Education', '💼',
        <>
          {renderField('Current Employment', formData.currentEmployment)}
          {renderField('Monthly Income', formData.monthlyIncome ? `$${formData.monthlyIncome}` : 'N/A')}
          {renderField('Spouse Employment', formData.spouseEmployment)}
          {renderField('Spouse Monthly Income', formData.spouseMonthlyIncome ? `$${formData.spouseMonthlyIncome}` : 'N/A')}
          {renderField('Persons Supported', formData.personsSupported)}
          {renderField('Public Assistance', formData.publicAssistance)}
          {renderField('Education Level', formData.educationLevel)}
          {renderField('Trade School Specify', formData.tradeSchoolDetails || formData.tradeSchoolSpecify)}
        </>
      )}

      {/* General Questions & Preferences */}
      {renderSection('General Questions & Preferences', '💭',
        <>
          {renderField('Surrogacy Understanding', formData.surrogacyUnderstanding)}
          {renderField('Self Introduction', formData.selfIntroduction)}
          {renderField('Main Concerns', Array.isArray(formData.mainConcerns) ? formData.mainConcerns.join(', ') : formData.mainConcerns)}
          {renderField('Parent Qualities', formData.parentQualities)}
          {renderField('Religious Background Preference', formData.religiousPreference)}
          {renderField('Work with Unmarried Couple', formData.unmarriedCouple)}
          {renderField('Work with Heterosexual Couple', formData.heterosexualCouple)}
          {renderField('Work with Egg Donor', formData.eggDonor)}
          {renderField('Work with Sperm Donor', formData.spermDonor)}
          {renderField('Work with Older Couple', formData.olderCouple)}
          {renderField('Work with Couple with Children', formData.coupleWithChildren)}
          {renderField('Work with International Couple', formData.internationalCouple)}
          {renderField('Work with Non-English Speaking Couple', formData.nonEnglishCouple)}
          {renderField('Willing to Carry Twins', formData.carryTwins)}
          {renderField('Willing to Reduce Multiples', formData.reduceMultiples)}
          {renderField('Willing to Undergo Amniocentesis', formData.amniocentesis)}
          {renderField('Willing to Abort for Birth Defects', formData.abortBirthDefects)}
          {renderField('Contact During Process', formData.contactDuringProcess)}
          {renderField('Contact After Birth', formData.contactAfterBirth)}
          {renderField('Concerns About Placing Baby', formData.concernsPlacingBaby)}
          {renderField('Permit Parents in Delivery Room', formData.parentsInDeliveryRoom)}
          {renderField('Permit Parents at Doctor Appointments', formData.parentsAtAppointments)}
          {renderField('Permit Hospital Notification', formData.hospitalNotification)}
          {renderField('Allow Parents Names on Birth Certificate', formData.parentsOnBirthCertificate)}
          {renderField('Currently Applying Elsewhere', formData.applyingElsewhere)}
          {renderField('Previously Rejected Elsewhere', formData.previouslyRejected)}
          {renderField('Able to Attend Prenatal Check-ups', formData.attendPrenatalCheckups)}
          {renderField('Willing to Undergo Medical Examinations', formData.medicalExaminations)}
          {renderField('Able to Follow Lifestyle Guidelines', formData.lifestyleGuidelines)}
          {renderField('Willing to Avoid Long-distance Travel', formData.avoidLongTravel)}
          {renderField('Willing to Refrain from High-risk Work', formData.refrainHighRiskWork)}
          {renderField('Placed Child for Adoption', formData.placedForAdoption)}
          {renderField('Expected Support', formData.expectedSupport)}
          {renderField('Non-supportive People', formData.nonSupportivePeople)}
          {renderField('Husband/Partner Feelings', formData.partnerFeelings)}
          {renderField('Adequate Child Care Support', formData.childCareSupport)}
          {renderField('Work with Same Sex Couple', formData.sameSexCouple)}
          {renderField('Work with Single Male', formData.singleMale)}
          {renderField('Work with Single Female', formData.singleFemale)}
        </>
      )}

      {/* Authorization */}
      {renderSection('Authorization', '📝',
        <>
          {renderField('Authorization Agreed', formData.authorizationAgreed)}
          {renderField('Applicant Address', formData.applicantAddress)}
        </>
      )}

      {/* Application Status */}
      {application && (
        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <p className="text-sm text-gray-600">
            Application Status: <span className="font-medium">{application.status?.toUpperCase() || 'PENDING'}</span>
          </p>
          <p className="text-sm text-gray-500">
            Submitted: {application.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      )}
    </div>
  );
}

