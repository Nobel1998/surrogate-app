import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';

export default function SurrogateApplicationScreen({ navigation, route }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8; // Updated to 8 steps based on PDF
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [applicationData, setApplicationData] = useState({
    // Step 1: Personal Information (Extended)
    firstName: '',
    middleName: '',
    lastName: '',
    fullName: user?.name || '',
    age: user?.user_metadata?.age || '',
    dateOfBirth: user?.user_metadata?.date_of_birth || user?.dateOfBirth || '',
    dateOfBirthMonth: '',
    dateOfBirthDay: '',
    dateOfBirthYear: '',
    phoneNumber: user?.phone || '',
    email: user?.email || '',
    location: user?.address || '',
    hearAboutUs: user?.user_metadata?.hear_about_us || '',
    race: user?.user_metadata?.race || user?.race || '',
    referralCode: user?.user_metadata?.referred_by || '',
    bloodType: '',
    height: '',
    weight: '',
    significantWeightChange: false,
    religiousBackground: '',
    practicingReligion: false,
    usCitizen: false,
    citizenshipStatus: '',
    maritalStatus: '', // single, married, widowed, divorced, separated, lifePartner, engaged
    spouseName: '',
    spouseDateOfBirth: '',
    marriageDate: '',
    widowedDate: '',
    maritalProblems: '',
    divorced: false,
    divorceDate: '',
    divorceCause: '',
    remarried: false,
    remarriedDate: '',
    legallySeparated: false,
    separationDetails: '',
    lifePartner: false,
    partnerName: '',
    partnerDateOfBirth: '',
    engaged: false,
    engagementDate: '',
    weddingDate: '',
    wantMoreChildren: false,
    legalProblems: '',
    jailTime: '',
    nearestAirport: '',
    airportDistance: '',
    pets: '',
    livingSituation: '', // own, family, rent
    ownCar: false,
    driverLicense: false,
    carInsured: false,
    transportationMethod: '',
    siblingsCount: '',
    motherSiblingsCount: '',
    
    // Step 2: Pregnancy & Delivery History
    totalDeliveries: '',
    deliveries: [], // Array of delivery objects (up to 5)
    previousSurrogacy: false,
    previousSurrogacyCount: '',
    
    // Step 3: Health Information (Extended)
    healthInsurance: false,
    maternityCoverage: false,
    insuranceDetails: '',
    stateAgencyInsurance: false,
    stateAgencyName: '',
    insurancePaymentMethod: '', // privately, employer
    deliveryHospital: '',
    deliveredAtHospitalBefore: false,
    abnormalPapSmear: false,
    monthlyCycles: false,
    cycleDays: '',
    periodDays: '',
    lastMenstrualPeriod: '',
    infertilityDoctor: false,
    infertilityDetails: '',
    smokingStatus: '',
    smokedDuringPregnancy: false,
    householdSmoking: false,
    householdSmokingDetails: '',
    householdMarijuana: false,
    alcoholUsage: '',
    alcoholFrequency: '',
    illegalDrugs: false,
    partnerIllegalDrugs: false,
    childrenList: '',
    pregnancyProblems: false,
    pregnancyProblemsDetails: '',
    childrenHealthProblems: false,
    childrenHealthDetails: '',
    breastfeeding: false,
    breastfeedingStopDate: '',
    surgeries: false,
    surgeryDetails: '',
    seriousIllnesses: '',
    hospitalizations: '',
    currentMedications: '',
    tattoosPiercings: false,
    tattoosPiercingsDate: '',
    mentalHealthTreatment: false,
    mentalHealthDetails: '',
    postpartumDepression: false,
    postpartumDepressionDetails: '',
    depressionMedication: false,
    depressionMedicationDetails: '',
    drugAlcoholAbuse: false,
    excessHeat: false,
    allergies: false,
    allergiesDetails: '',
    hepatitisBVaccinated: false,
    alcoholLimitAdvised: false,
    
    // Step 4: Sexual History
    pastContraceptives: '',
    currentBirthControl: false,
    birthControlMethod: '',
    birthControlDuration: '',
    sexualPartner: false,
    multiplePartners: false,
    partnersLastThreeYears: '',
    highRiskHIVContact: false,
    hivRisk: false,
    bloodTransfusion: false,
    stdHistory: false,
    stdDetails: '',
    
    // Step 5: Employment Information
    currentEmployment: '',
    monthlyIncome: '',
    spouseEmployment: '',
    spouseMonthlyIncome: '',
    personsSupported: '',
    publicAssistance: false,
    householdMembers: '',
    
    // Step 6: Education History
    educationLevel: '', // highSchool, college, tradeSchool
    tradeSchoolDetails: '',
    
    // Step 7: General Questions & Preferences
    surrogacyUnderstanding: '',
    selfIntroduction: '',
    mainConcerns: [], // Array of concerns
    parentQualities: '',
    religiousPreference: false,
    unmarriedCouple: false,
    heterosexualCouple: false,
    sameSexCouple: false,
    singleMale: false,
    singleFemale: false,
    eggDonor: false,
    spermDonor: false,
    olderCouple: false,
    coupleWithChildren: false,
    internationalCouple: false,
    nonEnglishSpeaking: false,
    carryTwins: false,
    reductionWilling: false,
    amniocentesis: false,
    abortionWilling: false,
    contactDuringProcess: '',
    contactAfterBirth: '',
    concernsPlacingBaby: false,
    parentsInDeliveryRoom: false,
    parentsAtAppointments: false,
    notifyHospital: false,
    parentsOnBirthCertificate: false,
    applyingElsewhere: false,
    rejectedElsewhere: false,
    attendCheckups: false,
    receiveInjections: false,
    medicalExaminations: false,
    followGuidelines: false,
    avoidLongTravel: false,
    avoidHighRiskWork: false,
    placedChildAdoption: false,
    expectedSupport: '',
    unsupportivePeople: false,
    partnerFeelings: '',
    childcareSupport: false,
    compensationExpectations: '',
    timelineAvailability: '',
    travelWillingness: false,
    specialPreferences: '',
    additionalComments: '',
    
    // Step 8: Authorization
    authorizationAgreed: false,
    applicantName: '',
    applicationDate: '',
    applicantEmail: '',
    applicantAddress: '',
    applicantPhone: '',
    emergencyContact: '',
  });

  const updateField = (field, value) => {
    setApplicationData(prev => ({ ...prev, [field]: value }));
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const hasDigit = (str) => /\d/.test(str);
    let code = '';
    // ensure at least one digit
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (!hasDigit(code));
    return code;
  };

  // Draft storage helpers
  const getDraftKey = () => (user?.id ? `application_draft_${user.id}` : 'application_draft_guest');

  const loadDraft = async (userIdOverride = null) => {
    try {
      const uid = userIdOverride || user?.id;
      // Only restore for authenticated users to keep first-time guests blank
      if (!uid) {
        return;
      }
      // 1) If logged in, try to pull latest application from Supabase
      {
        const { data: latest, error } = await supabase
          .from('applications')
          .select('full_name, phone, form_data, status, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.log('⚠️ Load draft from Supabase failed:', error.message);
        }

        if (latest) {
          let parsed = {};
          try {
            parsed = latest.form_data ? JSON.parse(latest.form_data) : {};
          } catch (e) {
            // ignore parse error, fallback to parsed = {}
          }
          const merged = {
            fullName: latest.full_name || parsed.fullName || applicationData.fullName,
            phoneNumber: latest.phone || parsed.phoneNumber || applicationData.phoneNumber,
            age: parsed.age || applicationData.age || '',
            dateOfBirth: parsed.dateOfBirth || applicationData.dateOfBirth || '',
            location: parsed.location || applicationData.location,
            hearAboutUs: parsed.hearAboutUs || applicationData.hearAboutUs,
          race: parsed.race || applicationData.race || '',
          referralCode: parsed.referralCode || applicationData.referralCode || '',
            ...parsed,
          };
          // ensure state updates flush before formVersion bump
          setApplicationData(prev => ({ ...prev, ...merged }));
          setTimeout(() => {
            const newVersion = Date.now();
            setFormVersion(newVersion);
            setCurrentStep(1);
          }, 0);
          return;
        }
      }

      // 2) Fallback to local draft (authenticated users only)
      const draft = await AsyncStorageLib.getItem(userIdOverride ? `application_draft_${uid}` : getDraftKey());
      if (draft) {
        const parsed = JSON.parse(draft);
        setApplicationData(prev => ({ ...prev, ...parsed }));
        setTimeout(() => {
          const newVersion = Date.now();
          setFormVersion(newVersion);
          setCurrentStep(1);
        }, 0);
      }
    } catch (err) {
      console.log('⚠️ loadDraft error:', err.message);
    }
  };

  useEffect(() => {
    loadDraft();
  }, [user?.id]);

  // Fallback: when user logs in and has user_metadata, update form fields directly
  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata;
      setApplicationData(prev => ({
        ...prev,
        age: prev.age || meta.age || '',
        dateOfBirth: prev.dateOfBirth || meta.date_of_birth || '',
        hearAboutUs: prev.hearAboutUs || meta.hear_about_us || '',
        fullName: prev.fullName || meta.name || user?.name || '',
        phoneNumber: prev.phoneNumber || meta.phone || user?.phone || '',
        location: prev.location || meta.location || user?.address || '',
        race: prev.race || meta.race || user?.race || '',
        referralCode: prev.referralCode || meta.referred_by || '',
      }));
    }
  }, [user?.user_metadata]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadDraft(user.id);
      }
    }, [user?.id])
  );

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Basic validation: at least 10 digits, allow separators like - . ( ) space
    const phoneRegex = /^[\d\-.()+ ]{10,}$/;
    return phoneRegex.test(phone);
  };

  const calculateAgeFromDateOfBirth = (dateOfBirth) => {
    // Parse date in MM/DD/YYYY format
    const dateParts = dateOfBirth.split('/');
    if (dateParts.length !== 3) {
      return null;
    }
    
    const month = parseInt(dateParts[0], 10);
    const day = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      return null;
    }
    
    // Validate date
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    
    // Check if date is valid
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
      return null;
    }
    
    // Check if birth date is in the future
    if (birthDate > today) {
      return null;
    }
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!applicationData.fullName.trim()) {
          Alert.alert(t('common.error'), t('application.errorEnterFullName'));
          return false;
        }
        if (!applicationData.age || parseInt(applicationData.age) < 21 || parseInt(applicationData.age) > 40) {
          Alert.alert(t('common.error'), t('application.errorAgeRange'));
          return false;
        }
        if (!applicationData.dateOfBirth.trim()) {
          Alert.alert(t('common.error'), t('application.errorEnterDateOfBirth'));
          return false;
        }
        
        // Validate date of birth format and calculate age from it
        const calculatedAge = calculateAgeFromDateOfBirth(applicationData.dateOfBirth);
        if (calculatedAge === null) {
          Alert.alert(t('common.error'), t('application.errorInvalidDateOfBirth'));
          return false;
        }
        
        // Check if calculated age matches entered age (allow 1 year difference for rounding)
        const enteredAge = parseInt(applicationData.age);
        if (Math.abs(calculatedAge - enteredAge) > 1) {
          Alert.alert(t('common.error'), t('application.errorAgeMismatch', { calculatedAge, enteredAge }));
          return false;
        }
        
        // Verify calculated age is within valid range
        if (calculatedAge < 21 || calculatedAge > 40) {
          Alert.alert(t('common.error'), t('application.errorAgeOutOfRange', { age: calculatedAge }));
          return false;
        }
        
        if (!applicationData.phoneNumber.trim()) {
          Alert.alert(t('common.error'), t('application.errorEnterPhoneNumber'));
          return false;
        }
        if (!validatePhone(applicationData.phoneNumber.trim())) {
          Alert.alert(t('common.error'), t('application.errorInvalidPhoneNumber'));
          return false;
        }
        if (!applicationData.email.trim()) {
          Alert.alert(t('common.error'), t('application.errorEnterEmail'));
          return false;
        }
        if (!validateEmail(applicationData.email.trim())) {
          Alert.alert(t('common.error'), t('application.errorInvalidEmail'));
          return false;
        }
        if (!applicationData.hearAboutUs.trim()) {
          Alert.alert(t('common.error'), t('application.errorHearAboutUs'));
          return false;
        }
        return true;
      
      case 2:
        if (!applicationData.previousPregnancies.trim()) {
          Alert.alert(t('common.error'), t('application.errorPreviousPregnancies'));
          return false;
        }
        return true;
      
      case 3:
        if (!applicationData.smokingStatus) {
          Alert.alert(t('common.error'), t('application.errorSmokingStatus'));
          return false;
        }
        if (!applicationData.employmentStatus) {
          Alert.alert(t('common.error'), t('application.errorEmploymentStatus'));
          return false;
        }
        return true;
      
      case 4:
        // Step 4 validation can be optional or basic
        return true;
      
      case 5:
        // Step 5 validation can be optional
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    // Lazy registration: require auth after Step 1 if not logged in
    if (currentStep === 1 && !user) {
      if (!validateStep(1)) return;
      // Save local draft before prompting auth
      AsyncStorageLib.setItem(getDraftKey(), JSON.stringify(applicationData))
        .then(() => console.log('💾 Draft saved locally before auth:', applicationData))
        .catch(() => {});
      setShowAuthPrompt(true);
      return;
    }

    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Lazy sign-up for surrogates to save progress after step 1
  const handleLazySignup = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert(t('common.error'), t('application.errorEnterEmailPassword'));
      return;
    }
    if (!authPasswordConfirm.trim()) {
      Alert.alert(t('common.error'), t('application.errorEnterConfirmPassword'));
      return;
    }
    if (authPassword !== authPasswordConfirm) {
      Alert.alert(t('common.error'), t('application.errorPasswordsDoNotMatch'));
      return;
    }
    if (!validateEmail(authEmail.trim())) {
      Alert.alert(t('common.error'), t('application.errorInvalidEmailFormat'));
      return;
    }
    // Mark intent to resume application flow before auth state changes
    console.log('🔖 pre-signup: setting resume_application_flow=true');
    await AsyncStorageLib.setItem('resume_application_flow', 'true');
    setAuthLoading(true);
    try {
      const role = 'surrogate';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            role,
            name: applicationData.fullName,
            phone: applicationData.phoneNumber,
            location: applicationData.location || '',
            age: applicationData.age || '',
            date_of_birth: applicationData.dateOfBirth || '',
            hear_about_us: applicationData.hearAboutUs || '',
            race: applicationData.race || '',
            referred_by: applicationData.referralCode?.trim() || null,
          },
        },
      });

      if (authError) throw authError;

      const userId = authData?.user?.id;
      if (userId) {
        // Upsert profile
        let inviteCode = generateInviteCode();
        let attempts = 0;
        while (attempts < 3) {
          const profilePayload = {
            id: userId,
            role,
            name: applicationData.fullName,
            phone: applicationData.phoneNumber,
            date_of_birth: applicationData.dateOfBirth || null,
            email: authEmail.trim(),
            location: applicationData.location || '',
            invite_code: inviteCode,
            race: applicationData.race || '',
            referred_by: applicationData.referralCode?.trim() || null,
          };
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });

          if (!profileError) break;

          if (profileError.code === '23505') {
            // duplicate invite_code, regenerate and retry
            inviteCode = generateInviteCode();
            attempts += 1;
            continue;
          }

          throw profileError;
        }

        // Mark that we should stay on application flow after auth switch
        console.log('🔖 setting resume_application_flow=true after lazy signup');
        await AsyncStorageLib.setItem('resume_application_flow', 'true');

        // Save local draft under the new user key
        await AsyncStorageLib.setItem(`application_draft_${userId}`, JSON.stringify(applicationData));

        // Force state reapply immediately by reloading draft with the new user id
        await loadDraft(userId);
        const newVersion = Date.now();
        setFormVersion(newVersion);
        setCurrentStep(1);
      }

      // Store email into form for continuity
      updateField('email', authEmail.trim());
      setShowAuthPrompt(false);
      // pass draft via route params to survive navigator remounts
      navigation.setParams({ draft: applicationData, draftVersion: Date.now() });
      setCurrentStep(1);
      Alert.alert(t('application.progressSaved'), t('application.accountCreatedProgressSaved'));
    } catch (error) {
      console.error('Lazy signup error:', error);
      Alert.alert(t('application.errorSavingProgress'), error.message || t('application.errorSavingProgressMessage'));
      await AsyncStorageLib.removeItem('resume_application_flow');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    
    try {
      // 获取当前认证用户ID
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('Please log in to submit an application');
      }

      // Ensure profile carries latest race / referred_by and contact info, preserving invite_code
      let existingInviteCode = null;
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('invite_code')
          .eq('id', authUser.id)
          .maybeSingle();
        existingInviteCode = existingProfile?.invite_code || null;
      } catch (_) {
        existingInviteCode = null;
      }
      const ensuredInviteCode = existingInviteCode || generateInviteCode();
      const profileUpdate = {
        id: authUser.id,
        name: applicationData.fullName,
        phone: applicationData.phoneNumber,
        date_of_birth: applicationData.dateOfBirth || null,
        email: applicationData.email || authUser.email,
        location: applicationData.location || '',
        race: applicationData.race || '',
        referred_by: applicationData.referralCode?.trim() || null,
        invite_code: ensuredInviteCode,
      };
      const { error: profileUpsertError } = await supabase
        .from('profiles')
        .upsert(profileUpdate, { onConflict: 'id' });
      if (profileUpsertError) {
        throw new Error(profileUpsertError.message);
      }

      // Construct payload for Supabase
      const { fullName, phoneNumber, ...otherFields } = applicationData;
      const payload = {
        full_name: fullName,
        phone: phoneNumber,
        form_data: JSON.stringify(otherFields),
        user_id: authUser.id  // 添加用户ID
      };

      console.log('📝 Submitting application for user:', authUser.id);

      // Insert into Supabase
      const { data, error } = await supabase
        .from('applications')
        .insert([payload])
        .select();

      if (error) {
        throw new Error(error.message);
      }

      // Application submitted successfully; clear resume flag
      await AsyncStorageLib.removeItem('resume_application_flow');

      // Create local application object for history
      const application = {
        id: data && data[0] ? data[0].id : `APP-${Date.now()}`,
        type: 'Surrogacy Application',
        status: 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        description: `Surrogacy Application - ${applicationData.fullName}`,
        nextStep: 'Wait for initial review and medical screening',
        documents: ['Application Form', 'Medical History', 'Background Check'],
        notes: 'Application submitted successfully. Our team will review and contact you within 5-7 business days.',
        data: applicationData,
      };

      // Save application to AsyncStorage (keep local history working)
      try {
        const existingApplications = await AsyncStorageLib.getItem('user_applications');
        let applications = [];
        
        if (existingApplications) {
          applications = JSON.parse(existingApplications);
        }
        
        // Add new application to the beginning of the array
        applications.unshift(application);
        
        // Save updated applications list
        await AsyncStorageLib.setItem('user_applications', JSON.stringify(applications));
      } catch (storageError) {
        console.error('Error saving application locally:', storageError);
        // Continue even if storage fails, as Supabase succeeded
      }

      Alert.alert(
        t('application.submissionSuccess'),
        t('application.submissionSuccessMessage'),
        [
          {
            text: t('common.confirm'),
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else if (navigation.navigate) {
                if (user) {
                  navigation.navigate('MainTabs');
                } else {
                  navigation.navigate('GuestTabs');
                }
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('application.submissionError'), error.message || t('application.submissionErrorMessage'));
      console.error('Submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>Please answer all questions. If something does not apply to you, please write N/A</Text>
      
      {/* Full Legal Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is your full legal name? *</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={applicationData.firstName}
              onChangeText={(value) => updateField('firstName', value)}
              placeholder="First Name"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={applicationData.middleName}
              onChangeText={(value) => updateField('middleName', value)}
              placeholder="Middle Name"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={applicationData.lastName}
              onChangeText={(value) => updateField('lastName', value)}
              placeholder="Last Name"
            />
          </View>
        </View>
        {/* Also keep fullName for backward compatibility */}
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={applicationData.fullName || `${applicationData.firstName} ${applicationData.middleName} ${applicationData.lastName}`.trim()}
          onChangeText={(value) => updateField('fullName', value)}
          placeholder="Full Name (or auto-filled from above)"
        />
      </View>

      {/* Date of Birth */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is your date of birth? *</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={applicationData.dateOfBirthMonth || ''}
              onChangeText={(value) => updateField('dateOfBirthMonth', value)}
              placeholder="Month"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={applicationData.dateOfBirthDay || ''}
              onChangeText={(value) => updateField('dateOfBirthDay', value)}
              placeholder="Day"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={applicationData.dateOfBirthYear || ''}
              onChangeText={(value) => updateField('dateOfBirthYear', value)}
              placeholder="Year"
              keyboardType="numeric"
            />
          </View>
        </View>
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={applicationData.dateOfBirth || ''}
          onChangeText={(value) => updateField('dateOfBirth', value)}
          placeholder="Or enter as MM-DD-YYYY"
        />
      </View>

      {/* Age (calculated or entered) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age *</Text>
        <TextInput
          key={`age-${formVersion}`}
          style={styles.input}
          value={applicationData.age || ''}
          onChangeText={(value) => updateField('age', value)}
          placeholder="Age (21-40)"
          keyboardType="numeric"
        />
      </View>

      {/* How did you hear about us */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>How did you hear about us? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.hearAboutUs || ''}
          onChangeText={(value) => updateField('hearAboutUs', value)}
          placeholder="How did you hear about us?"
        />
      </View>

      {/* Previous Surrogacy */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you been a surrogate before? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.previousSurrogacy === true && styles.radioButtonSelected]}
            onPress={() => updateField('previousSurrogacy', true)}
          >
            <Text style={[styles.radioText, applicationData.previousSurrogacy === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.previousSurrogacy === false && styles.radioButtonSelected]}
            onPress={() => updateField('previousSurrogacy', false)}
          >
            <Text style={[styles.radioText, applicationData.previousSurrogacy === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.previousSurrogacy && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>How many times have you been a surrogate before? *</Text>
          <TextInput
            style={styles.input}
            value={applicationData.previousSurrogacyCount || ''}
            onChangeText={(value) => updateField('previousSurrogacyCount', value)}
            placeholder="Number of times"
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Blood Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is your blood type? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.bloodType || ''}
          onChangeText={(value) => updateField('bloodType', value)}
          placeholder="e.g., A+, B-, O+, AB+"
        />
      </View>

      {/* Height */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is your height? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.height || ''}
          onChangeText={(value) => updateField('height', value)}
          placeholder="e.g., 5'6 or 168 cm"
        />
      </View>

      {/* Weight */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is your weight? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.weight || ''}
          onChangeText={(value) => updateField('weight', value)}
          placeholder="Weight in lbs or kg"
          keyboardType="numeric"
        />
      </View>

      {/* Significant Weight Change */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you gained/lost a significant amount of weight in the last year? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.significantWeightChange === true && styles.radioButtonSelected]}
            onPress={() => updateField('significantWeightChange', true)}
          >
            <Text style={[styles.radioText, applicationData.significantWeightChange === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.significantWeightChange === false && styles.radioButtonSelected]}
            onPress={() => updateField('significantWeightChange', false)}
          >
            <Text style={[styles.radioText, applicationData.significantWeightChange === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Race/Ethnic Background */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is your race/ethnic background? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.race || ''}
          onChangeText={(value) => updateField('race', value)}
          placeholder="Race/Ethnic background"
        />
      </View>

      {/* Religious Background */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is your religious background? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.religiousBackground || ''}
          onChangeText={(value) => updateField('religiousBackground', value)}
          placeholder="Religious background"
        />
      </View>

      {/* Practicing Religion */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you currently practicing in your religion? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.practicingReligion === true && styles.radioButtonSelected]}
            onPress={() => updateField('practicingReligion', true)}
          >
            <Text style={[styles.radioText, applicationData.practicingReligion === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.practicingReligion === false && styles.radioButtonSelected]}
            onPress={() => updateField('practicingReligion', false)}
          >
            <Text style={[styles.radioText, applicationData.practicingReligion === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* US Citizen */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you a US Citizen? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.usCitizen === true && styles.radioButtonSelected]}
            onPress={() => updateField('usCitizen', true)}
          >
            <Text style={[styles.radioText, applicationData.usCitizen === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.usCitizen === false && styles.radioButtonSelected]}
            onPress={() => updateField('usCitizen', false)}
          >
            <Text style={[styles.radioText, applicationData.usCitizen === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!applicationData.usCitizen && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>If you are not a US Citizen, please specify your citizenship and current legal status in United States *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.citizenshipStatus || ''}
            onChangeText={(value) => updateField('citizenshipStatus', value)}
            placeholder="Citizenship and legal status"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Contact Information */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.phoneNumber}
          onChangeText={(value) => updateField('phoneNumber', value)}
          placeholder="Phone Number"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.email}
          onChangeText={(value) => updateField('email', value)}
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.location || ''}
          onChangeText={(value) => updateField('location', value)}
          placeholder="Street Address, City, State, Zip Code"
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );

  // Helper function to render delivery form
  const renderDeliveryForm = (deliveryIndex) => {
    const delivery = applicationData.deliveries[deliveryIndex] || {};
    const updateDeliveryField = (field, value) => {
      const newDeliveries = [...(applicationData.deliveries || [])];
      if (!newDeliveries[deliveryIndex]) {
        newDeliveries[deliveryIndex] = {};
      }
      newDeliveries[deliveryIndex][field] = value;
      updateField('deliveries', newDeliveries);
    };

    return (
      <View key={deliveryIndex} style={{ marginBottom: 30, padding: 15, backgroundColor: '#F8F9FB', borderRadius: 12 }}>
        <Text style={[styles.label, { fontSize: 18, marginBottom: 15 }]}>Delivery #{deliveryIndex + 1}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Year *</Text>
          <TextInput
            style={styles.input}
            value={delivery.year || ''}
            onChangeText={(value) => updateDeliveryField('year', value)}
            placeholder="Year"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>How Did You Conceive? *</Text>
          <TextInput
            style={styles.input}
            value={delivery.conceptionMethod || ''}
            onChangeText={(value) => updateDeliveryField('conceptionMethod', value)}
            placeholder="e.g., Natural, IVF, IUI"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date Of Delivery *</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={delivery.deliveryMonth || ''}
                onChangeText={(value) => updateDeliveryField('deliveryMonth', value)}
                placeholder="Month"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={delivery.deliveryDay || ''}
                onChangeText={(value) => updateDeliveryField('deliveryDay', value)}
                placeholder="Day"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={delivery.deliveryYear || ''}
                onChangeText={(value) => updateDeliveryField('deliveryYear', value)}
                placeholder="Year"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Birth Weight *</Text>
          <TextInput
            style={styles.input}
            value={delivery.birthWeight || ''}
            onChangeText={(value) => updateDeliveryField('birthWeight', value)}
            placeholder="Weight in lbs or kg"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[styles.radioButton, delivery.gender === 'boy' && styles.radioButtonSelected]}
              onPress={() => updateDeliveryField('gender', 'boy')}
            >
              <Text style={[styles.radioText, delivery.gender === 'boy' && styles.radioTextSelected]}>Boy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, delivery.gender === 'girl' && styles.radioButtonSelected]}
              onPress={() => updateDeliveryField('gender', 'girl')}
            >
              <Text style={[styles.radioText, delivery.gender === 'girl' && styles.radioTextSelected]}>Girl</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weeks Of Gestation To Delivery *</Text>
          <TextInput
            style={styles.input}
            value={delivery.gestationWeeks || ''}
            onChangeText={(value) => updateDeliveryField('gestationWeeks', value)}
            placeholder="Weeks"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>No Of Fetuses *</Text>
          <TextInput
            style={styles.input}
            value={delivery.fetusesCount || ''}
            onChangeText={(value) => updateDeliveryField('fetusesCount', value)}
            placeholder="Number of fetuses"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pregnancy Resulted In *</Text>
          <TextInput
            style={styles.input}
            value={delivery.pregnancyResult || ''}
            onChangeText={(value) => updateDeliveryField('pregnancyResult', value)}
            placeholder="e.g., Live birth, Stillbirth"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Delivery Method *</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[styles.radioButton, delivery.deliveryMethod === 'vaginally' && styles.radioButtonSelected]}
              onPress={() => updateDeliveryField('deliveryMethod', 'vaginally')}
            >
              <Text style={[styles.radioText, delivery.deliveryMethod === 'vaginally' && styles.radioTextSelected]}>Vaginally</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, delivery.deliveryMethod === 'c-section' && styles.radioButtonSelected]}
              onPress={() => updateDeliveryField('deliveryMethod', 'c-section')}
            >
              <Text style={[styles.radioText, delivery.deliveryMethod === 'c-section' && styles.radioTextSelected]}>C-Section</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Complications</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={delivery.complications || ''}
            onChangeText={(value) => updateDeliveryField('complications', value)}
            placeholder="Any complications during pregnancy or delivery"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>
    );
  };

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Pregnancy & Delivery History</Text>
      <Text style={styles.stepDescription}>Total Delivery Times (Count ONLY births at 20+ weeks)</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Delivery Times *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.totalDeliveries || ''}
          onChangeText={(value) => {
            updateField('totalDeliveries', value);
            const count = parseInt(value) || 0;
            const maxDeliveries = Math.min(count, 5); // Max 5 deliveries
            const currentDeliveries = applicationData.deliveries || [];
            // Ensure we have enough delivery objects
            while (currentDeliveries.length < maxDeliveries) {
              currentDeliveries.push({});
            }
            // Trim if needed
            if (currentDeliveries.length > maxDeliveries) {
              currentDeliveries.splice(maxDeliveries);
            }
            updateField('deliveries', currentDeliveries);
          }}
          placeholder="Number of deliveries (20+ weeks)"
          keyboardType="numeric"
        />
      </View>

      {/* Render delivery forms based on totalDeliveries */}
      {applicationData.deliveries && applicationData.deliveries.length > 0 && (
        <View>
          {applicationData.deliveries.map((_, index) => renderDeliveryForm(index))}
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you been a surrogate before? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.previousSurrogacy === true && styles.radioButtonSelected]}
            onPress={() => updateField('previousSurrogacy', true)}
          >
            <Text style={[styles.radioText, applicationData.previousSurrogacy === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.previousSurrogacy === false && styles.radioButtonSelected]}
            onPress={() => updateField('previousSurrogacy', false)}
          >
            <Text style={[styles.radioText, applicationData.previousSurrogacy === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.previousSurrogacy && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>How many times have you been a surrogate before? *</Text>
          <TextInput
            style={styles.input}
            value={applicationData.previousSurrogacyCount || ''}
            onChangeText={(value) => updateField('previousSurrogacyCount', value)}
            placeholder="Number of times"
            keyboardType="numeric"
          />
        </View>
      )}
    </ScrollView>
  );
        <TextInput
          style={styles.input}
          value={applicationData.bmi}
          onChangeText={(value) => updateField('bmi', value)}
          placeholder={t('application.bmiPlaceholder')}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('application.step3Title')}</Text>
      <Text style={styles.stepDescription}>{t('application.step3Description')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.smokingStatus')}</Text>
        <View style={styles.radioContainer}>
          {['Non-smoker', 'Former smoker', 'Current smoker'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.radioButton, applicationData.smokingStatus === option && styles.radioButtonSelected]}
              onPress={() => updateField('smokingStatus', option)}
            >
              <Text style={[styles.radioText, applicationData.smokingStatus === option && styles.radioTextSelected]}>
                {option === 'Non-smoker' ? t('application.nonSmoker') : option === 'Former smoker' ? t('application.formerSmoker') : t('application.currentSmoker')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.alcoholUsage')}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.alcoholUsage}
          onChangeText={(value) => updateField('alcoholUsage', value)}
          placeholder={t('application.alcoholUsagePlaceholder')}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.exerciseRoutine')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.exerciseRoutine}
          onChangeText={(value) => updateField('exerciseRoutine', value)}
          placeholder={t('application.exerciseRoutinePlaceholder')}
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.employmentStatus')}</Text>
        <View style={styles.radioContainer}>
          {['Employed Full-time', 'Employed Part-time', 'Self-employed', 'Unemployed', 'Student'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.radioButton, applicationData.employmentStatus === option && styles.radioButtonSelected]}
              onPress={() => updateField('employmentStatus', option)}
            >
              <Text style={[styles.radioText, applicationData.employmentStatus === option && styles.radioTextSelected]}>
                {option === 'Employed Full-time' ? t('application.employedFullTime') : 
                 option === 'Employed Part-time' ? t('application.employedPartTime') :
                 option === 'Self-employed' ? t('application.selfEmployed') :
                 option === 'Unemployed' ? t('application.unemployed') : t('application.student')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.supportSystem')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.supportSystem}
          onChangeText={(value) => updateField('supportSystem', value)}
          placeholder={t('application.supportSystemPlaceholder')}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('application.step4Title')}</Text>
      <Text style={styles.stepDescription}>{t('application.step4Description')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.criminalBackground')}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.criminalBackground === false && styles.radioButtonSelected]}
            onPress={() => updateField('criminalBackground', false)}
          >
            <Text style={[styles.radioText, applicationData.criminalBackground === false && styles.radioTextSelected]}>{t('application.noCriminalRecord')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.criminalBackground === true && styles.radioButtonSelected]}
            onPress={() => updateField('criminalBackground', true)}
          >
            <Text style={[styles.radioText, applicationData.criminalBackground === true && styles.radioTextSelected]}>{t('application.hasCriminalRecord')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.criminalBackground && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('application.pleaseExplain')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.legalIssues}
            onChangeText={(value) => updateField('legalIssues', value)}
            placeholder={t('application.pleaseExplainPlaceholder')}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.insuranceCoverage')}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.insuranceCoverage}
          onChangeText={(value) => updateField('insuranceCoverage', value)}
          placeholder={t('application.insuranceCoveragePlaceholder')}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.financialStability')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.financialStability}
          onChangeText={(value) => updateField('financialStability', value)}
          placeholder={t('application.financialStabilityPlaceholder')}
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('application.step5Title')}</Text>
      <Text style={styles.stepDescription}>{t('application.step5Description')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.compensationExpectations')}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.compensationExpectations}
          onChangeText={(value) => updateField('compensationExpectations', value)}
          placeholder={t('application.compensationExpectationsPlaceholder')}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.timelineAvailability')}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.timelineAvailability}
          onChangeText={(value) => updateField('timelineAvailability', value)}
          placeholder={t('application.timelineAvailabilityPlaceholder')}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.willingnessToTravel')}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.travelWillingness === true && styles.radioButtonSelected]}
            onPress={() => updateField('travelWillingness', true)}
          >
            <Text style={[styles.radioText, applicationData.travelWillingness === true && styles.radioTextSelected]}>{t('application.yes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.travelWillingness === false && styles.radioButtonSelected]}
            onPress={() => updateField('travelWillingness', false)}
          >
            <Text style={[styles.radioText, applicationData.travelWillingness === false && styles.radioTextSelected]}>{t('application.no')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.specialPreferences')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.specialPreferences}
          onChangeText={(value) => updateField('specialPreferences', value)}
          placeholder={t('application.specialPreferencesPlaceholder')}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.additionalComments')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.additionalComments}
          onChangeText={(value) => updateField('additionalComments', value)}
          placeholder={t('application.additionalCommentsPlaceholder')}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('application.inviteCode')}</Text>
        <Text style={styles.subLabel}>{t('application.inviteCodeSubLabel')}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.referralCode}
          onChangeText={(value) => updateField('referralCode', value)}
          placeholder={t('application.inviteCodePlaceholder')}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  // Placeholder functions for additional steps - to be implemented
  const renderStep6 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Employment Information</Text>
      <Text style={styles.stepDescription}>Please provide your employment details</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Employment</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.currentEmployment || ''}
          onChangeText={(value) => updateField('currentEmployment', value)}
          placeholder="Position, date of employment, location"
          multiline
          numberOfLines={3}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Monthly Income</Text>
        <TextInput
          style={styles.input}
          value={applicationData.monthlyIncome || ''}
          onChangeText={(value) => updateField('monthlyIncome', value)}
          placeholder="Monthly income"
          keyboardType="numeric"
        />
      </View>
    </ScrollView>
  );

  const renderStep7 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>General Questions & Preferences</Text>
      <Text style={styles.stepDescription}>Please answer the following questions</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Briefly explain your understanding of what being a gestational carrier will entail and your motivation</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.surrogacyUnderstanding || ''}
          onChangeText={(value) => updateField('surrogacyUnderstanding', value)}
          placeholder="Your understanding and motivation"
          multiline
          numberOfLines={5}
        />
      </View>
    </ScrollView>
  );

  const renderStep8 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Authorization</Text>
      <Text style={styles.stepDescription}>Please review and confirm</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>I hereby authorize Babytree Surrogacy to disclose the information contained in this Surrogate Application to anyone interested in reviewing my application to assist them in selecting a Surrogate, and for review by appropriate medical and psychological professionals and their staffs.</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.authorizationAgreed === true && styles.radioButtonSelected]}
            onPress={() => updateField('authorizationAgreed', true)}
          >
            <Text style={[styles.radioText, applicationData.authorizationAgreed === true && styles.radioTextSelected]}>I Agree</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} key={formVersion}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backHomeButton}
              onPress={() => {
                if (user) {
                  navigation.navigate('MainTabs');
                } else {
                  navigation.navigate('Landing');
                }
              }}
            >
              <Text style={styles.backHomeText}>{t('application.backToHome')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('application.title')}</Text>
            <Text style={styles.subtitle}>{t('application.subtitle')}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{t('application.step')} {currentStep} / {totalSteps}</Text>
          </View>
        </View>

        <View style={styles.form}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          {currentStep === 7 && renderStep7()}
          {currentStep === 8 && renderStep8()}

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
                <Text style={styles.previousButtonText}>{t('application.previous')}</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < totalSteps ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>{t('application.next')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>
                  {isLoading ? t('common.loading') : t('application.submit')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Lazy auth modal */}
      {showAuthPrompt && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.authModalOverlay}>
            <View style={styles.authModal}>
              <Text style={styles.authTitle}>{t('application.createAccount')}</Text>
              <Text style={styles.authSubtitle}>
                {t('application.createAccountDescription')}
              </Text>
              <TextInput
                style={styles.authInput}
                placeholder={t('application.enterEmail')}
                autoCapitalize="none"
                keyboardType="email-address"
                value={authEmail}
                onChangeText={setAuthEmail}
              />
              <TextInput
                style={styles.authInput}
                placeholder="Password"
                secureTextEntry
                value={authPassword}
                onChangeText={setAuthPassword}
              />
              <TextInput
                style={styles.authInput}
                placeholder="Confirm Password"
                secureTextEntry
                value={authPasswordConfirm}
                onChangeText={setAuthPasswordConfirm}
              />
              <View style={styles.authActions}>
                <TouchableOpacity
                  style={[styles.authButton, styles.authCancel]}
                  onPress={() => setShowAuthPrompt(false)}
                  disabled={authLoading}
                >
                  <Text style={styles.authCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authButton, styles.authSave]}
                  onPress={handleLazySignup}
                  disabled={authLoading}
                >
                  <Text style={styles.authSaveText}>{authLoading ? t('common.loading') : t('application.createAccount')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  backHomeButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backHomeText: {
    color: '#2A7BF6',
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A7BF6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2A7BF6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F8F9FB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  radioButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#F8F9FB',
    minWidth: 100,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#2A7BF6',
    borderColor: '#2A7BF6',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radioTextSelected: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  previousButton: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 10,
  },
  previousButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2A7BF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginLeft: 10,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#28A745',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Auth modal styles
  authModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authModal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 6,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#6E7191',
    marginBottom: 16,
  },
  authInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1D1E',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7EE',
  },
  authActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  authButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  authCancel: {
    backgroundColor: '#F5F7FA',
  },
  authCancelText: {
    color: '#6E7191',
    fontWeight: '600',
  },
  authSave: {
    backgroundColor: '#2A7BF6',
  },
  authSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
});
