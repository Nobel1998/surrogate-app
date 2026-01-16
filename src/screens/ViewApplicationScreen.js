import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function ViewApplicationScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [formData, setFormData] = useState({});

  // Reload data when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      loadApplication();
    }, [user])
  );

  const loadApplication = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading application:', error);
      } else if (data) {
        setApplication(data);
        // Parse form_data JSON
        try {
          const parsed = data.form_data ? JSON.parse(data.form_data) : {};
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViewApplicationScreen.js:loadApplication:parsed',message:'Parsed form_data',data:{hasPhotoUrl:!!parsed.photoUrl,photoUrl:parsed.photoUrl,formDataKeys:Object.keys(parsed)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          setFormData(parsed);
        } catch (e) {
          console.error('Error parsing form_data:', e);
        }
      }
    } catch (error) {
      console.error('Failed to load application:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBoolean = (value) => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return 'N/A';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    return String(value);
  };

  const renderField = (label, value) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{formatValue(value)}</Text>
    </View>
  );

  const renderBooleanField = (label, value) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, value === true ? styles.yesValue : value === false ? styles.noValue : null]}>
        {formatBoolean(value)}
      </Text>
    </View>
  );

  const renderSection = (title, icon, color, children) => (
    <View style={[styles.section, { borderLeftColor: color }]}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={20} color={color} />
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2A7BF6" />
          <Text style={styles.loadingText}>Loading application...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="file-text" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No application found</Text>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => navigation.navigate('SurrogateApplication')}
          >
            <Text style={styles.submitButtonText}>Submit Application</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleEditApplication = () => {
    navigation.navigate('SurrogateApplication', {
      editMode: true,
      applicationId: application.id,
      existingData: {
        ...formData,
        fullName: application.full_name,
        phoneNumber: application.phone,
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, 
          application.status === 'approved' ? styles.statusApproved :
          application.status === 'rejected' ? styles.statusRejected :
          styles.statusPending
        ]}>
          <Icon 
            name={application.status === 'approved' ? 'check-circle' : application.status === 'rejected' ? 'x-circle' : 'clock'} 
            size={24} 
            color="#fff" 
          />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>
              {application.status === 'approved' ? 'Application Approved' :
               application.status === 'rejected' ? 'Application Rejected' :
               'Application Under Review'}
            </Text>
            <Text style={styles.statusDate}>
              Submitted: {new Date(application.created_at).toLocaleDateString('en-US')}
            </Text>
          </View>
        </View>

        {/* Edit Button */}
        <TouchableOpacity style={styles.editButton} onPress={handleEditApplication}>
          <Icon name="edit-2" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edit Application</Text>
        </TouchableOpacity>

        {/* Step 1: Personal Information */}
        {renderSection('Personal Information', 'user', '#2196F3',
          <>
            {/* Surrogate Photo */}
            {formData.photoUrl && (
              <View style={styles.photoContainer}>
                <Text style={styles.fieldLabel}>Surrogate Photo</Text>
                <Image
                  source={{ uri: formData.photoUrl }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
              </View>
            )}
            {renderField('Full Name', application.full_name || formData.fullName)}
            {renderField('First Name', formData.firstName)}
            {renderField('Middle Name', formData.middleName)}
            {renderField('Last Name', formData.lastName)}
            {renderField('Date of Birth', formData.dateOfBirth)}
            {renderField('Age', formData.age)}
            {renderField('Blood Type', formData.bloodType)}
            {renderField('Height', formData.height)}
            {renderField('Weight', formData.weight)}
            {renderField('Race/Ethnicity', formData.race)}
            {renderField('Phone', application.phone || formData.phoneNumber)}
            {renderField('Email', formData.email)}
            {renderField('Address', formData.address || formData.applicantAddress)}
            {renderBooleanField('US Citizen', formData.usCitizen)}
            {renderField('Religious Background', formData.religiousBackground)}
            {renderBooleanField('Practicing Religion', formData.practicingReligion)}
            {renderField('Hear About Us', formData.hearAboutUs)}
            {renderField('Referral Code', formData.referralCode)}
            {renderField('Siblings Count', formData.siblingsCount)}
            {renderField('Mother Siblings Count', formData.motherSiblingsCount)}
            {renderField('Pets', formData.pets)}
            {renderField('Living Situation', formData.livingSituation)}
            {renderBooleanField('Own Car', formData.ownCar)}
            {renderBooleanField('Driver License', formData.driverLicense)}
            {renderBooleanField('Car Insured', formData.carInsured)}
            {renderField('Transportation Method', formData.transportationMethod)}
            {renderField('Nearest Airport', formData.nearestAirport)}
            {renderField('Airport Distance', formData.airportDistance)}
            {renderField('Legal Problems', formData.legalProblems)}
            {renderField('Jail Time', formData.jailTime)}
            {renderBooleanField('Want More Children', formData.wantMoreChildren)}
            {renderBooleanField('Previous Surrogacy', formData.previousSurrogacy)}
            {renderField('Previous Surrogacy Count', formData.previousSurrogacyCount)}
          </>
        )}

        {/* Marital Status */}
        {renderSection('Marital Status & Family', 'heart', '#E91E63',
          <>
            {renderField('Marital Status', formData.maritalStatus)}
            {renderField('Are you single?', formData.isSingle === true ? 'Yes' : formData.isSingle === false ? 'No' : 'N/A')}
            {renderField('Are you married?', formData.isMarried === true ? 'Yes' : formData.isMarried === false ? 'No' : 'N/A')}
            {renderField('Are you widowed?', formData.isWidowed === true ? 'Yes' : formData.isWidowed === false ? 'No' : 'N/A')}
            {renderBooleanField('Life Partner', formData.lifePartner)}
            {renderBooleanField('Engaged', formData.engaged)}
            {renderField('Spouse/Partner Name', formData.spouseName || formData.partnerName)}
            {renderField('Spouse/Partner Date of Birth', formData.spouseDateOfBirth || formData.partnerDateOfBirth)}
            {renderField('Marriage Date', formData.marriageDate)}
            {renderField('Wedding Date', formData.weddingDate)}
            {renderField('Widowed Date', formData.widowedDate)}
            {renderField('Marital Problems', formData.maritalProblems)}
            {renderBooleanField('Divorced', formData.divorced)}
            {renderField('Divorce Date', formData.divorceDate)}
            {renderField('Divorce Cause', formData.divorceCause)}
            {renderBooleanField('Remarried', formData.remarried)}
            {renderField('Remarried Date', formData.remarriedDate)}
            {renderBooleanField('Legally Separated', formData.legallySeparated)}
            {renderField('Separation Details', formData.separationDetails)}
            {renderField('Engagement Date', formData.engagementDate)}
          </>
        )}

        {/* Step 2: Pregnancy History */}
        {renderSection('Pregnancy & Delivery History', 'heart', '#E91E63',
          <>
            {renderField('Total Deliveries', formData.totalDeliveries)}
            {formData.deliveries && formData.deliveries.length > 0 && (
              <View style={styles.deliveriesContainer}>
                {formData.deliveries.map((delivery, index) => (
                  delivery && (delivery.year || delivery.gender) && (
                    <View key={index} style={styles.deliveryCard}>
                      <Text style={styles.deliveryTitle}>Delivery #{index + 1}</Text>
                      <View style={styles.deliveryGrid}>
                        <Text style={styles.deliveryItem}>Year: {delivery.year || 'N/A'}</Text>
                        <Text style={styles.deliveryItem}>Gender: {delivery.gender || 'N/A'}</Text>
                        <Text style={styles.deliveryItem}>Weight: {delivery.birthWeight || 'N/A'}</Text>
                        <Text style={styles.deliveryItem}>Method: {delivery.deliveryMethod || 'N/A'}</Text>
                      </View>
                    </View>
                  )
                ))}
              </View>
            )}
          </>
        )}

        {/* Step 3: Health Information */}
        {renderSection('Health Information', 'activity', '#4CAF50',
          <>
            {renderBooleanField('Health Insurance', formData.healthInsurance)}
            {renderBooleanField('Maternity Coverage', formData.maternityCoverage)}
            {renderField('Insurance Details', formData.insuranceDetails)}
            {renderBooleanField('State Agency Insurance', formData.stateAgencyInsurance)}
            {renderField('State Agency Name', formData.stateAgencyName)}
            {renderField('Insurance Payment Method', formData.insurancePaymentMethod)}
            {renderField('Delivery Hospital', formData.deliveryHospital)}
            {renderBooleanField('Delivered at Hospital Before', formData.deliveredAtHospitalBefore)}
            {renderBooleanField('Abnormal Pap Smear', formData.abnormalPapSmear)}
            {renderBooleanField('Monthly Cycles', formData.monthlyCycles)}
            {renderField('Cycle Days', formData.cycleDays)}
            {renderField('Period Days', formData.periodDays)}
            {renderField('Last Menstrual Period', formData.lastMenstrualPeriod)}
            {renderBooleanField('Infertility Doctor', formData.infertilityDoctor)}
            {renderField('Infertility Details', formData.infertilityDetails)}
            {renderBooleanField('Household Marijuana Use', formData.householdMarijuana)}
            {renderBooleanField('Pregnancy Problems', formData.pregnancyProblems)}
            {renderField('Pregnancy Problems Details', formData.pregnancyProblemsDetails)}
            {renderBooleanField('Children Health Problems', formData.childrenHealthProblems)}
            {renderField('Children Health Details', formData.childrenHealthDetails)}
            {renderBooleanField('Currently Breastfeeding', formData.breastfeeding)}
            {renderField('Breastfeeding Stop Date', formData.breastfeedingStopDate)}
            {renderBooleanField('Tattoos/Piercings (Last 1.5 years)', formData.tattoosPiercings)}
            {renderField('Tattoos/Piercings Date', formData.tattoosPiercingsDate)}
            {renderBooleanField('Depression Medication', formData.depressionMedication)}
            {renderField('Depression Medication Details', formData.depressionMedicationDetails)}
            {renderBooleanField('Drug/Alcohol Abuse', formData.drugAlcoholAbuse)}
            {renderBooleanField('Excess Heat Exposure', formData.excessHeat)}
            {renderBooleanField('Alcohol Limit Advised', formData.alcoholLimitAdvised)}
            {renderField('Smoking Status', formData.smokingStatus)}
            {renderBooleanField('Smoked During Pregnancy', formData.smokedDuringPregnancy)}
            {renderField('Alcohol Usage', formData.alcoholUsage)}
            {renderBooleanField('Illegal Drugs', formData.illegalDrugs)}
            {renderBooleanField('Mental Health Treatment', formData.mentalHealthTreatment)}
            {renderBooleanField('Postpartum Depression', formData.postpartumDepression)}
            {renderBooleanField('Hepatitis B Vaccinated', formData.hepatitisBVaccinated)}
            {renderBooleanField('Allergies', formData.allergies)}
            {renderField('Allergies Details', formData.allergiesDetails)}
            {renderField('Children List', formData.childrenList)}
            {renderField('Current Medications', formData.currentMedications)}
          </>
        )}

        {/* Step 4: Sexual History */}
        {renderSection('Sexual History', 'shield', '#9C27B0',
          <>
            {renderField('Past Contraceptives', formData.pastContraceptives)}
            {renderBooleanField('Current Birth Control', formData.currentBirthControl)}
            {renderField('Birth Control Method', formData.birthControlMethod)}
            {renderField('Birth Control Duration', formData.birthControlDuration)}
            {renderBooleanField('Sexual Partner', formData.sexualPartner)}
            {renderBooleanField('Multiple Partners', formData.multiplePartners)}
            {renderField('Partners (Last 3 Years)', formData.partnersLastThreeYears)}
            {renderBooleanField('High Risk HIV Contact', formData.highRiskHIVContact)}
            {renderBooleanField('HIV Risk', formData.hivRisk)}
            {renderBooleanField('Blood Transfusion', formData.bloodTransfusion)}
            {renderBooleanField('STD History', formData.stdHistory)}
            {renderField('STD Details', formData.stdDetails)}
          </>
        )}

        {/* Step 5: Employment */}
        {renderSection('Employment Information', 'briefcase', '#FF9800',
          <>
            {renderField('Current Employment', formData.currentEmployment)}
            {renderField('Monthly Income', formData.monthlyIncome ? `$${formData.monthlyIncome}` : 'N/A')}
            {renderField('Spouse Employment', formData.spouseEmployment)}
            {renderField('Spouse Monthly Income', formData.spouseMonthlyIncome ? `$${formData.spouseMonthlyIncome}` : 'N/A')}
            {renderField('Persons Supported', formData.personsSupported)}
            {renderBooleanField('Public Assistance', formData.publicAssistance)}
          </>
        )}

        {/* Step 6: Education */}
        {renderSection('Education', 'book', '#3F51B5',
          <>
            {renderField('Education Level', 
              formData.educationLevel === 'highSchool' ? 'High School' :
              formData.educationLevel === 'college' ? 'College' :
              formData.educationLevel === 'tradeSchool' ? 'Trade School' :
              formData.educationLevel || 'N/A'
            )}
            {renderField('Trade School Specify', formData.tradeSchoolDetails)}
          </>
        )}

        {/* Step 7: General Questions & Preferences */}
        {renderSection('General Questions & Preferences', 'settings', '#607D8B',
          <>
            {renderField('Surrogacy Understanding', formData.surrogacyUnderstanding)}
            {renderField('Self Introduction', formData.selfIntroduction)}
            {renderField('Main Concerns', Array.isArray(formData.mainConcerns) ? formData.mainConcerns.join(', ') : formData.mainConcerns)}
            {renderField('Parent Qualities', formData.parentQualities)}
            {renderBooleanField('Religious Background Preference', formData.religiousPreference)}
            {renderBooleanField('Work with Unmarried Couple', formData.unmarriedCouple)}
            {renderBooleanField('Work with Heterosexual Couple', formData.heterosexualCouple)}
            {renderBooleanField('Work with Same Sex Couple', formData.sameSexCouple)}
            {renderBooleanField('Work with Single Male', formData.singleMale)}
            {renderBooleanField('Work with Single Female', formData.singleFemale)}
            {renderBooleanField('Work with Egg Donor', formData.eggDonor)}
            {renderBooleanField('Work with Sperm Donor', formData.spermDonor)}
            {renderBooleanField('Work with Older Couple', formData.olderCouple)}
            {renderBooleanField('Work with Couple with Children', formData.coupleWithChildren)}
            {renderBooleanField('Work with International Couple', formData.internationalCouple)}
            {renderBooleanField('Work with Non-English Speaking Couple', formData.nonEnglishSpeaking)}
            {renderBooleanField('Willing to Carry Twins', formData.carryTwins)}
            {renderBooleanField('Willing to Reduce Multiples', formData.reduceMultiples)}
            {renderBooleanField('Willing to Undergo Amniocentesis', formData.amniocentesis)}
            {renderBooleanField('Willing to Abort for Birth Defects', formData.abortBirthDefects)}
            {renderField('Contact During Process', formData.contactDuringProcess)}
            {renderField('Contact After Birth', formData.contactAfterBirth)}
            {renderBooleanField('Concerns About Placing Baby', formData.concernsPlacingBaby)}
            {renderBooleanField('Permit Parents in Delivery Room', formData.parentsInDeliveryRoom)}
            {renderBooleanField('Permit Parents at Doctor Appointments', formData.parentsAtAppointments)}
            {renderBooleanField('Permit Hospital Notification', formData.hospitalNotification)}
            {renderBooleanField('Allow Parents Names on Birth Certificate', formData.parentsOnBirthCertificate)}
            {renderBooleanField('Currently Applying Elsewhere', formData.applyingElsewhere)}
            {renderBooleanField('Previously Rejected Elsewhere', formData.previouslyRejected)}
            {renderBooleanField('Able to Attend Prenatal Check-ups', formData.attendPrenatalCheckups)}
            {renderBooleanField('Willing to Undergo Medical Examinations', formData.medicalExaminations)}
            {renderBooleanField('Able to Follow Lifestyle Guidelines', formData.lifestyleGuidelines)}
            {renderBooleanField('Willing to Avoid Long-distance Travel', formData.avoidLongTravel)}
            {renderBooleanField('Willing to Refrain from High-risk Work', formData.refrainHighRiskWork)}
            {renderBooleanField('Placed Child for Adoption', formData.placedForAdoption)}
            {renderField('Expected Support', formData.expectedSupport)}
            {renderBooleanField('Non-supportive People', formData.nonSupportivePeople)}
            {renderField('Husband/Partner Feelings', formData.partnerFeelings)}
            {renderBooleanField('Adequate Child Care Support', formData.childCareSupport)}
          </>
        )}

        {/* Step 8: Authorization */}
        {renderSection('Authorization', 'check-square', '#F44336',
          <>
            {renderBooleanField('Authorization Agreed', formData.authorizationAgreed)}
            {renderField('Applicant Address', formData.applicantAddress)}
            {renderField('Emergency Contact', formData.emergencyContact)}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#FF9800',
  },
  statusApproved: {
    backgroundColor: '#4CAF50',
  },
  statusRejected: {
    backgroundColor: '#F44336',
  },
  statusTextContainer: {
    marginLeft: 12,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statusDate: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A7BF6',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#2A7BF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  yesValue: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  noValue: {
    color: '#F44336',
    fontWeight: '500',
  },
  deliveriesContainer: {
    marginTop: 8,
  },
  deliveryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E91E63',
    marginBottom: 8,
  },
  deliveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  deliveryItem: {
    width: '50%',
    fontSize: 12,
    color: '#666',
    paddingVertical: 2,
  },
  bottomPadding: {
    height: 30,
  },
  photoContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
});

