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
  
  // Edit mode parameters
  const editMode = route?.params?.editMode || false;
  const applicationId = route?.params?.applicationId || null;
  const existingData = route?.params?.existingData || null;
  
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
    address: user?.address || '',
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
    isSingle: null, // true = YES, false = NO, null = not answered
    isMarried: null, // true = YES, false = NO, null = not answered
    isWidowed: null, // true = YES, false = NO, null = not answered
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
    educationLevel: '', // highSchool, college
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
    setApplicationData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-sync fullName when firstName, middleName, or lastName changes
      if (field === 'firstName' || field === 'middleName' || field === 'lastName') {
        const firstName = field === 'firstName' ? value : prev.firstName || '';
        const middleName = field === 'middleName' ? value : prev.middleName || '';
        const lastName = field === 'lastName' ? value : prev.lastName || '';
        updated.fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' ');
      }
      // Auto-sync dateOfBirth when month, day, or year changes
      if (field === 'dateOfBirthMonth' || field === 'dateOfBirthDay' || field === 'dateOfBirthYear') {
        const month = field === 'dateOfBirthMonth' ? value : prev.dateOfBirthMonth || '';
        const day = field === 'dateOfBirthDay' ? value : prev.dateOfBirthDay || '';
        const year = field === 'dateOfBirthYear' ? value : prev.dateOfBirthYear || '';
        if (month && day && year) {
          updated.dateOfBirth = `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
        }
      }
      return updated;
    });
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

  // Extract city/state from full address for location field
  // Examples:
  // "123 Main St, San Francisco, CA 94102" -> "San Francisco, CA"
  // "456 Oak Ave, Los Angeles" -> "Los Angeles"
  // "789 Pine Rd, New York, NY" -> "New York, NY"
  const extractLocationFromAddress = (address) => {
    if (!address || typeof address !== 'string') return '';
    
    const parts = address.split(',').map(p => p.trim());
    
    if (parts.length >= 3) {
      // Format: Street, City, State/Zip -> return "City, State"
      // Remove zip code if present in the last part
      const lastPart = parts[parts.length - 1].replace(/\d{5}(-\d{4})?/, '').trim();
      const cityPart = parts[parts.length - 2];
      if (lastPart) {
        return `${cityPart}, ${lastPart}`;
      }
      return cityPart;
    } else if (parts.length === 2) {
      // Format: Street, City -> return "City"
      return parts[1];
    }
    
    // If no comma, return empty (can't reliably extract city)
    return '';
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
            address: parsed.address || applicationData.address,
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
        address: prev.address || meta.address || user?.address || '',
        race: prev.race || meta.race || user?.race || '',
        referralCode: prev.referralCode || meta.referred_by || '',
      }));
    }
  }, [user?.user_metadata]);

  useFocusEffect(
    React.useCallback(() => {
      if (editMode && existingData) {
        // Load existing data for editing
        console.log('📝 Loading existing application data for editing');
        setApplicationData(prev => ({
          ...prev,
          ...existingData,
        }));
        // Parse dateOfBirth into components if available
        if (existingData.dateOfBirth && existingData.dateOfBirth.includes('/')) {
          const parts = existingData.dateOfBirth.split('/');
          if (parts.length === 3) {
            setApplicationData(prev => ({
              ...prev,
              dateOfBirthMonth: parts[0],
              dateOfBirthDay: parts[1],
              dateOfBirthYear: parts[2],
            }));
          }
        }
      } else if (user?.id) {
        loadDraft(user.id);
      }
    }, [user?.id, editMode, existingData])
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
            address: applicationData.address || '',
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
          // Extract location from address if not already set
          const extractedLocation = extractLocationFromAddress(applicationData.address);
          
          const profilePayload = {
            id: userId,
            role,
            name: applicationData.fullName,
            phone: applicationData.phoneNumber,
            date_of_birth: applicationData.dateOfBirth || null,
            email: authEmail.trim(),
            address: applicationData.address || '',
            location: extractedLocation || '', // Auto-extract city from address
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
      
      // Extract location from address if address is provided
      const extractedLocation = extractLocationFromAddress(applicationData.address);
      
      const profileUpdate = {
        id: authUser.id,
        name: applicationData.fullName,
        phone: applicationData.phoneNumber,
        date_of_birth: applicationData.dateOfBirth || null,
        email: applicationData.email || authUser.email,
        address: applicationData.address || '',
        race: applicationData.race || '',
        referred_by: applicationData.referralCode?.trim() || null,
        invite_code: ensuredInviteCode,
      };
      
      // Only update location if we extracted one from address
      if (extractedLocation) {
        profileUpdate.location = extractedLocation;
      }
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

      let resultData;
      
      if (editMode && applicationId) {
        // Update existing application
        console.log('📝 Updating application:', applicationId);
        const { data, error } = await supabase
          .from('applications')
          .update({
            full_name: payload.full_name,
            phone: payload.phone,
            form_data: payload.form_data,
          })
          .eq('id', applicationId)
          .select();

        if (error) {
          throw new Error(error.message);
        }
        resultData = data;
      } else {
        // Insert new application
        console.log('📝 Submitting new application for user:', authUser.id);
      const { data, error } = await supabase
        .from('applications')
        .insert([payload])
        .select();

      if (error) {
        throw new Error(error.message);
        }
        resultData = data;
      }

      // Application submitted/updated successfully; clear resume flag
      await AsyncStorageLib.removeItem('resume_application_flow');

      // Create local application object for history
      const application = {
        id: resultData && resultData[0] ? resultData[0].id : `APP-${Date.now()}`,
        type: 'Surrogacy Application',
        status: editMode ? 'updated' : 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        description: `Surrogacy Application - ${applicationData.fullName}`,
        nextStep: 'Wait for initial review and medical screening',
        documents: ['Application Form', 'Medical History', 'Background Check'],
        notes: editMode ? 'Application updated successfully.' : 'Application submitted successfully. Our team will review and contact you within 5-7 business days.',
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
        editMode ? t('application.updateSuccess') : t('application.submissionSuccess'),
        editMode ? t('application.updateSuccessMessage') : t('application.submissionSuccessMessage'),
        [
          {
            text: t('common.confirm'),
            onPress: () => {
              if (editMode) {
                // Go back to ViewApplication screen
                navigation.goBack();
              } else if (navigation.canGoBack()) {
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
          placeholder="Or enter as MM/DD/YYYY"
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
          value={applicationData.address || ''}
          onChangeText={(value) => updateField('address', value)}
          placeholder="Street Address, City, State, Zip Code"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Marital Status Section */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you single? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.isSingle === true && styles.radioButtonSelected]}
            onPress={() => {
              updateField('isSingle', true);
              updateField('maritalStatus', 'single');
              // Clear spouse/partner fields when selecting single
              updateField('spouseName', '');
              updateField('spouseDateOfBirth', '');
              updateField('marriageDate', '');
              updateField('lifePartner', false);
              updateField('partnerName', '');
              updateField('partnerDateOfBirth', '');
              updateField('engaged', false);
              updateField('engagementDate', '');
              updateField('weddingDate', '');
              updateField('isMarried', null);
              updateField('isWidowed', null);
            }}
          >
            <Text style={[styles.radioText, applicationData.isSingle === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.isSingle === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('isSingle', false);
              if (applicationData.maritalStatus === 'single') {
                updateField('maritalStatus', '');
              }
            }}
          >
            <Text style={[styles.radioText, applicationData.isSingle === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.isSingle === false && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Are you married? *</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.isMarried === true && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('isMarried', true);
                  updateField('maritalStatus', 'married');
                  updateField('lifePartner', false);
                  updateField('engaged', false);
                  updateField('isWidowed', false);
                }}
              >
                <Text style={[styles.radioText, applicationData.isMarried === true && styles.radioTextSelected]}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.isMarried === false && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('isMarried', false);
                  if (applicationData.maritalStatus === 'married') {
                    updateField('maritalStatus', '');
                    updateField('spouseName', '');
                    updateField('spouseDateOfBirth', '');
                    updateField('marriageDate', '');
                  }
                }}
              >
                <Text style={[styles.radioText, applicationData.isMarried === false && styles.radioTextSelected]}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Married - Spouse Information */}
          {applicationData.maritalStatus === 'married' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What was the date of your marriage? *</Text>
                <TextInput
                  style={styles.input}
                  value={applicationData.marriageDate || ''}
                  onChangeText={(value) => updateField('marriageDate', value)}
                  placeholder="MM/DD/YYYY"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>What is your spouse's name? *</Text>
                <TextInput
                  style={styles.input}
                  value={applicationData.spouseName || ''}
                  onChangeText={(value) => updateField('spouseName', value)}
                  placeholder="Spouse's full name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>What is your spouse's date of birth? *</Text>
                <TextInput
                  style={styles.input}
                  value={applicationData.spouseDateOfBirth || ''}
                  onChangeText={(value) => updateField('spouseDateOfBirth', value)}
                  placeholder="MM/DD/YYYY"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Have you ever experienced marital problems? If yes, please explain. *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={applicationData.maritalProblems || ''}
                  onChangeText={(value) => updateField('maritalProblems', value)}
                  placeholder="If yes, please explain"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Have you ever been divorced? *</Text>
                <View style={styles.radioContainer}>
                  <TouchableOpacity
                    style={[styles.radioButton, applicationData.divorced === true && styles.radioButtonSelected]}
                    onPress={() => updateField('divorced', true)}
                  >
                    <Text style={[styles.radioText, applicationData.divorced === true && styles.radioTextSelected]}>YES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, applicationData.divorced === false && styles.radioButtonSelected]}
                    onPress={() => {
                      updateField('divorced', false);
                      updateField('divorceDate', '');
                      updateField('divorceCause', '');
                    }}
                  >
                    <Text style={[styles.radioText, applicationData.divorced === false && styles.radioTextSelected]}>NO</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {applicationData.divorced && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>When did your divorce occur? *</Text>
                    <TextInput
                      style={styles.input}
                      value={applicationData.divorceDate || ''}
                      onChangeText={(value) => updateField('divorceDate', value)}
                      placeholder="MM/DD/YYYY"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>What was the cause of your break up? *</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={applicationData.divorceCause || ''}
                      onChangeText={(value) => updateField('divorceCause', value)}
                      placeholder="Reason for divorce"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Have you re-married? If yes, how long ago? *</Text>
                    <View style={styles.radioContainer}>
                      <TouchableOpacity
                        style={[styles.radioButton, applicationData.remarried === true && styles.radioButtonSelected]}
                        onPress={() => updateField('remarried', true)}
                      >
                        <Text style={[styles.radioText, applicationData.remarried === true && styles.radioTextSelected]}>YES</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.radioButton, applicationData.remarried === false && styles.radioButtonSelected]}
                        onPress={() => {
                          updateField('remarried', false);
                          updateField('remarriedDate', '');
                        }}
                      >
                        <Text style={[styles.radioText, applicationData.remarried === false && styles.radioTextSelected]}>NO</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {applicationData.remarried && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>When did you re-marry? *</Text>
                      <TextInput
                        style={styles.input}
                        value={applicationData.remarriedDate || ''}
                        onChangeText={(value) => updateField('remarriedDate', value)}
                        placeholder="MM/DD/YYYY"
                      />
                    </View>
                  )}
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Are you legally separated? *</Text>
                <View style={styles.radioContainer}>
                  <TouchableOpacity
                    style={[styles.radioButton, applicationData.legallySeparated === true && styles.radioButtonSelected]}
                    onPress={() => updateField('legallySeparated', true)}
                  >
                    <Text style={[styles.radioText, applicationData.legallySeparated === true && styles.radioTextSelected]}>YES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, applicationData.legallySeparated === false && styles.radioButtonSelected]}
                    onPress={() => {
                      updateField('legallySeparated', false);
                      updateField('separationDetails', '');
                    }}
                  >
                    <Text style={[styles.radioText, applicationData.legallySeparated === false && styles.radioTextSelected]}>NO</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {applicationData.legallySeparated && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>If you are separated, how long have you been married and how long have you been separated? *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={applicationData.separationDetails || ''}
                    onChangeText={(value) => updateField('separationDetails', value)}
                    placeholder="Marriage duration and separation duration"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </>
          )}

          {/* Widowed */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Are you widowed? If so, when was your partner deceased? *</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.isWidowed === true && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('isWidowed', true);
                  updateField('maritalStatus', 'widowed');
                  updateField('isMarried', false);
                  updateField('lifePartner', false);
                  updateField('engaged', false);
                }}
              >
                <Text style={[styles.radioText, applicationData.isWidowed === true && styles.radioTextSelected]}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.isWidowed === false && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('isWidowed', false);
                  if (applicationData.maritalStatus === 'widowed') {
                    updateField('maritalStatus', '');
                    updateField('widowedDate', '');
                  }
                }}
              >
                <Text style={[styles.radioText, applicationData.isWidowed === false && styles.radioTextSelected]}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.isWidowed === true && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>When was your partner deceased? *</Text>
              <TextInput
                style={styles.input}
                value={applicationData.widowedDate || ''}
                onChangeText={(value) => updateField('widowedDate', value)}
                placeholder="MM/DD/YYYY"
              />
            </View>
          )}

          {/* Life Partner */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Do you have a Life Partner? If so, how long have you been together? *</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.lifePartner === true && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('lifePartner', true);
                  updateField('maritalStatus', 'lifePartner');
                  updateField('married', false);
                  updateField('engaged', false);
                }}
              >
                <Text style={[styles.radioText, applicationData.lifePartner === true && styles.radioTextSelected]}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.lifePartner === false && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('lifePartner', false);
                  if (applicationData.maritalStatus === 'lifePartner') {
                    updateField('maritalStatus', '');
                  }
                  updateField('partnerName', '');
                  updateField('partnerDateOfBirth', '');
                }}
              >
                <Text style={[styles.radioText, applicationData.lifePartner === false && styles.radioTextSelected]}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.lifePartner && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What is your partner's full name and date of birth? *</Text>
                <TextInput
                  style={styles.input}
                  value={applicationData.partnerName || ''}
                  onChangeText={(value) => updateField('partnerName', value)}
                  placeholder="Partner's full name"
                />
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  value={applicationData.partnerDateOfBirth || ''}
                  onChangeText={(value) => updateField('partnerDateOfBirth', value)}
                  placeholder="Partner's date of birth (MM/DD/YYYY)"
                />
              </View>
            </>
          )}

          {/* Engaged */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Are you engaged? If so, when was your engagement and when are you scheduled to be married? *</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.engaged === true && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('engaged', true);
                  updateField('maritalStatus', 'engaged');
                  updateField('lifePartner', false);
                }}
              >
                <Text style={[styles.radioText, applicationData.engaged === true && styles.radioTextSelected]}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.engaged === false && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('engaged', false);
                  if (applicationData.maritalStatus === 'engaged') {
                    updateField('maritalStatus', '');
                  }
                  updateField('engagementDate', '');
                  updateField('weddingDate', '');
                }}
              >
                <Text style={[styles.radioText, applicationData.engaged === false && styles.radioTextSelected]}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.engaged && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>When was your engagement? *</Text>
                <TextInput
                  style={styles.input}
                  value={applicationData.engagementDate || ''}
                  onChangeText={(value) => updateField('engagementDate', value)}
                  placeholder="MM/DD/YYYY"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>When are you scheduled to be married? *</Text>
                <TextInput
                  style={styles.input}
                  value={applicationData.weddingDate || ''}
                  onChangeText={(value) => updateField('weddingDate', value)}
                  placeholder="MM/DD/YYYY"
                />
              </View>
            </>
          )}
        </>
      )}

      {/* Want More Children */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you like to have any more children of your own in the future? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.wantMoreChildren === true && styles.radioButtonSelected]}
            onPress={() => updateField('wantMoreChildren', true)}
          >
            <Text style={[styles.radioText, applicationData.wantMoreChildren === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.wantMoreChildren === false && styles.radioButtonSelected]}
            onPress={() => updateField('wantMoreChildren', false)}
          >
            <Text style={[styles.radioText, applicationData.wantMoreChildren === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal Problems */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Please list any problems you or your spouse/partner have experienced with the law including, but not limited to any arrests, convictions, and/or sentences. *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.legalProblems || ''}
          onChangeText={(value) => updateField('legalProblems', value)}
          placeholder="List any legal problems (or N/A)"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Jail Time */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you or your spouse/partner ever served time in jail? If yes, how much time did you serve and for what? *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.jailTime || ''}
          onChangeText={(value) => updateField('jailTime', value)}
          placeholder="Jail time details (or N/A)"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Nearest Airport */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is the name of the nearest airport to your home and how many miles is it away from your home? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.nearestAirport || ''}
          onChangeText={(value) => updateField('nearestAirport', value)}
          placeholder="Airport name and distance in miles"
        />
      </View>

      {/* Pets */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you have any pets? If yes, please list. *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.pets || ''}
          onChangeText={(value) => updateField('pets', value)}
          placeholder="List pets (or N/A)"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Current Living Situation */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Living Situation *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.livingSituation === 'own' && styles.radioButtonSelected]}
            onPress={() => updateField('livingSituation', 'own')}
          >
            <Text style={[styles.radioText, applicationData.livingSituation === 'own' && styles.radioTextSelected]}>I own the place I live in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.livingSituation === 'family' && styles.radioButtonSelected]}
            onPress={() => updateField('livingSituation', 'family')}
          >
            <Text style={[styles.radioText, applicationData.livingSituation === 'family' && styles.radioTextSelected]}>I live with family members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.livingSituation === 'rent' && styles.radioButtonSelected]}
            onPress={() => updateField('livingSituation', 'rent')}
          >
            <Text style={[styles.radioText, applicationData.livingSituation === 'rent' && styles.radioTextSelected]}>I rent the place I live in</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Own or Lease Car */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you own or lease a car? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.ownCar === true && styles.radioButtonSelected]}
            onPress={() => updateField('ownCar', true)}
          >
            <Text style={[styles.radioText, applicationData.ownCar === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.ownCar === false && styles.radioButtonSelected]}
            onPress={() => updateField('ownCar', false)}
          >
            <Text style={[styles.radioText, applicationData.ownCar === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver's License */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you have a driver's license? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.driverLicense === true && styles.radioButtonSelected]}
            onPress={() => updateField('driverLicense', true)}
          >
            <Text style={[styles.radioText, applicationData.driverLicense === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.driverLicense === false && styles.radioButtonSelected]}
            onPress={() => updateField('driverLicense', false)}
          >
            <Text style={[styles.radioText, applicationData.driverLicense === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Car Insured */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Is your car insured? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.carInsured === true && styles.radioButtonSelected]}
            onPress={() => updateField('carInsured', true)}
          >
            <Text style={[styles.radioText, applicationData.carInsured === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.carInsured === false && styles.radioButtonSelected]}
            onPress={() => updateField('carInsured', false)}
          >
            <Text style={[styles.radioText, applicationData.carInsured === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transportation Method - Only show if no license */}
      {applicationData.driverLicense === false && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>If you do not have a license how will you get to all necessary appointments? *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.transportationMethod || ''}
            onChangeText={(value) => updateField('transportationMethod', value)}
            placeholder="How will you get to appointments?"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Siblings Count */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>How many siblings do you have? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.siblingsCount || ''}
          onChangeText={(value) => updateField('siblingsCount', value)}
          placeholder="Number of siblings"
          keyboardType="numeric"
        />
      </View>

      {/* Mother's Siblings Count */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>How many siblings does your mother have? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.motherSiblingsCount || ''}
          onChangeText={(value) => updateField('motherSiblingsCount', value)}
          placeholder="Number of mother's siblings"
          keyboardType="numeric"
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

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Health Information</Text>
      <Text style={styles.stepDescription}>Please provide your health and medical details</Text>
      
      {/* Health Insurance */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you have health insurance? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.healthInsurance === true && styles.radioButtonSelected]}
            onPress={() => updateField('healthInsurance', true)}
          >
            <Text style={[styles.radioText, applicationData.healthInsurance === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.healthInsurance === false && styles.radioButtonSelected]}
            onPress={() => updateField('healthInsurance', false)}
          >
            <Text style={[styles.radioText, applicationData.healthInsurance === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.healthInsurance && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Does it have maternity coverage? *</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.maternityCoverage === true && styles.radioButtonSelected]}
                onPress={() => updateField('maternityCoverage', true)}
              >
                <Text style={[styles.radioText, applicationData.maternityCoverage === true && styles.radioTextSelected]}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.maternityCoverage === 'not_sure' && styles.radioButtonSelected]}
                onPress={() => updateField('maternityCoverage', 'not_sure')}
              >
                <Text style={[styles.radioText, applicationData.maternityCoverage === 'not_sure' && styles.radioTextSelected]}>Not Sure</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Insurance Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
              value={applicationData.insuranceDetails || ''}
              onChangeText={(value) => updateField('insuranceDetails', value)}
              placeholder="Provider name, policy number, etc."
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
            <Text style={styles.label}>Is your health insurance provided through a state agency or program?</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.stateAgencyInsurance === true && styles.radioButtonSelected]}
                onPress={() => updateField('stateAgencyInsurance', true)}
              >
                <Text style={[styles.radioText, applicationData.stateAgencyInsurance === true && styles.radioTextSelected]}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.stateAgencyInsurance === false && styles.radioButtonSelected]}
                onPress={() => updateField('stateAgencyInsurance', false)}
              >
                <Text style={[styles.radioText, applicationData.stateAgencyInsurance === false && styles.radioTextSelected]}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.stateAgencyInsurance && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>What state agency or program?</Text>
              <TextInput
                style={styles.input}
                value={applicationData.stateAgencyName || ''}
                onChangeText={(value) => updateField('stateAgencyName', value)}
                placeholder="State agency or program name"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Do you pay for your health insurance privately or is it provided by an employer?</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.insurancePaymentMethod === 'privately' && styles.radioButtonSelected]}
                onPress={() => updateField('insurancePaymentMethod', 'privately')}
              >
                <Text style={[styles.radioText, applicationData.insurancePaymentMethod === 'privately' && styles.radioTextSelected]}>Privately</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.insurancePaymentMethod === 'employer' && styles.radioButtonSelected]}
                onPress={() => updateField('insurancePaymentMethod', 'employer')}
              >
                <Text style={[styles.radioText, applicationData.insurancePaymentMethod === 'employer' && styles.radioTextSelected]}>Employer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Delivery Hospital */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What hospital do you intend to deliver your surrogate pregnancy? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.deliveryHospital || ''}
          onChangeText={(value) => updateField('deliveryHospital', value)}
          placeholder="Hospital name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you delivered at the previously listed hospital before? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.deliveredAtHospitalBefore === true && styles.radioButtonSelected]}
            onPress={() => updateField('deliveredAtHospitalBefore', true)}
          >
            <Text style={[styles.radioText, applicationData.deliveredAtHospitalBefore === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.deliveredAtHospitalBefore === false && styles.radioButtonSelected]}
            onPress={() => updateField('deliveredAtHospitalBefore', false)}
          >
            <Text style={[styles.radioText, applicationData.deliveredAtHospitalBefore === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Abnormal Pap Smear */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever had an abnormal pap smear? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.abnormalPapSmear === true && styles.radioButtonSelected]}
            onPress={() => updateField('abnormalPapSmear', true)}
          >
            <Text style={[styles.radioText, applicationData.abnormalPapSmear === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.abnormalPapSmear === false && styles.radioButtonSelected]}
            onPress={() => updateField('abnormalPapSmear', false)}
          >
            <Text style={[styles.radioText, applicationData.abnormalPapSmear === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menstrual Information */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do your menstrual cycles occur monthly? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.monthlyCycles === true && styles.radioButtonSelected]}
            onPress={() => updateField('monthlyCycles', true)}
          >
            <Text style={[styles.radioText, applicationData.monthlyCycles === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.monthlyCycles === false && styles.radioButtonSelected]}
            onPress={() => updateField('monthlyCycles', false)}
          >
            <Text style={[styles.radioText, applicationData.monthlyCycles === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How many days from the beginning of your period to the next month's first day of cycle?</Text>
        <TextInput
          style={styles.input}
          value={applicationData.cycleDays || ''}
          onChangeText={(value) => updateField('cycleDays', value)}
          placeholder="Number of days"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How many days does your period last?</Text>
        <TextInput
          style={styles.input}
          value={applicationData.periodDays || ''}
          onChangeText={(value) => updateField('periodDays', value)}
          placeholder="Number of days"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date of Last Menstrual Period</Text>
        <TextInput
          style={styles.input}
          value={applicationData.lastMenstrualPeriod || ''}
          onChangeText={(value) => updateField('lastMenstrualPeriod', value)}
          placeholder="MM/DD/YYYY"
        />
      </View>

      {/* Infertility Doctor */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever been seen by a doctor for infertility? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.infertilityDoctor === true && styles.radioButtonSelected]}
            onPress={() => updateField('infertilityDoctor', true)}
          >
            <Text style={[styles.radioText, applicationData.infertilityDoctor === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.infertilityDoctor === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('infertilityDoctor', false);
              updateField('infertilityDetails', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.infertilityDoctor === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.infertilityDoctor && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>If yes, please explain *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.infertilityDetails || ''}
            onChangeText={(value) => updateField('infertilityDetails', value)}
            placeholder="Please explain"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Smoking & Alcohol */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you currently or have you ever smoked cigarettes or ANY form of nicotine? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.smokingStatus === 'yes' && styles.radioButtonSelected]}
            onPress={() => updateField('smokingStatus', 'yes')}
          >
            <Text style={[styles.radioText, applicationData.smokingStatus === 'yes' && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.smokingStatus === 'no' && styles.radioButtonSelected]}
            onPress={() => updateField('smokingStatus', 'no')}
          >
            <Text style={[styles.radioText, applicationData.smokingStatus === 'no' && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.smokingStatus === 'yes' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Did you ever smoke during pregnancy?</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[styles.radioButton, applicationData.smokedDuringPregnancy === true && styles.radioButtonSelected]}
              onPress={() => updateField('smokedDuringPregnancy', true)}
            >
              <Text style={[styles.radioText, applicationData.smokedDuringPregnancy === true && styles.radioTextSelected]}>YES</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, applicationData.smokedDuringPregnancy === false && styles.radioButtonSelected]}
              onPress={() => updateField('smokedDuringPregnancy', false)}
            >
              <Text style={[styles.radioText, applicationData.smokedDuringPregnancy === false && styles.radioTextSelected]}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do any members of your household smoke cigarettes or ANY form of nicotine? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.householdSmoking === true && styles.radioButtonSelected]}
            onPress={() => updateField('householdSmoking', true)}
          >
            <Text style={[styles.radioText, applicationData.householdSmoking === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.householdSmoking === false && styles.radioButtonSelected]}
            onPress={() => updateField('householdSmoking', false)}
          >
            <Text style={[styles.radioText, applicationData.householdSmoking === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.householdSmoking && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Where and how often?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
            value={applicationData.householdSmokingDetails || ''}
            onChangeText={(value) => updateField('householdSmokingDetails', value)}
            placeholder="Details about household smoking"
          multiline
          numberOfLines={2}
        />
      </View>
      )}

      {/* Household Marijuana */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you or any members of your household smoke or inject marijuana? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.householdMarijuana === true && styles.radioButtonSelected]}
            onPress={() => updateField('householdMarijuana', true)}
          >
            <Text style={[styles.radioText, applicationData.householdMarijuana === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.householdMarijuana === false && styles.radioButtonSelected]}
            onPress={() => updateField('householdMarijuana', false)}
          >
            <Text style={[styles.radioText, applicationData.householdMarijuana === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you drink alcohol? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.alcoholUsage === 'yes' && styles.radioButtonSelected]}
            onPress={() => updateField('alcoholUsage', 'yes')}
          >
            <Text style={[styles.radioText, applicationData.alcoholUsage === 'yes' && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.alcoholUsage === 'no' && styles.radioButtonSelected]}
            onPress={() => updateField('alcoholUsage', 'no')}
          >
            <Text style={[styles.radioText, applicationData.alcoholUsage === 'no' && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.alcoholUsage === 'yes' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>How much and how often?</Text>
        <TextInput
          style={styles.input}
            value={applicationData.alcoholFrequency || ''}
            onChangeText={(value) => updateField('alcoholFrequency', value)}
            placeholder="Frequency and amount"
        />
      </View>
      )}

      {/* Drug Use */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever used illegal drugs or unprescribed drugs? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.illegalDrugs === true && styles.radioButtonSelected]}
            onPress={() => updateField('illegalDrugs', true)}
          >
            <Text style={[styles.radioText, applicationData.illegalDrugs === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.illegalDrugs === false && styles.radioButtonSelected]}
            onPress={() => updateField('illegalDrugs', false)}
          >
            <Text style={[styles.radioText, applicationData.illegalDrugs === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
    </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Has your partner/husband used illegal drugs or unprescribed drugs? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.partnerIllegalDrugs === true && styles.radioButtonSelected]}
            onPress={() => updateField('partnerIllegalDrugs', true)}
          >
            <Text style={[styles.radioText, applicationData.partnerIllegalDrugs === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.partnerIllegalDrugs === false && styles.radioButtonSelected]}
            onPress={() => updateField('partnerIllegalDrugs', false)}
          >
            <Text style={[styles.radioText, applicationData.partnerIllegalDrugs === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Children Info */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Please list the Name(s), Age(s), and Gender(s) of your children *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.childrenList || ''}
          onChangeText={(value) => updateField('childrenList', value)}
          placeholder="Name, Age, Gender for each child"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Pregnancy Problems */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Did you suffer any emotional or physical problems during and/or after each of your pregnancies? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.pregnancyProblems === true && styles.radioButtonSelected]}
            onPress={() => updateField('pregnancyProblems', true)}
          >
            <Text style={[styles.radioText, applicationData.pregnancyProblems === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.pregnancyProblems === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('pregnancyProblems', false);
              updateField('pregnancyProblemsDetails', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.pregnancyProblems === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.pregnancyProblems && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>If yes, please explain *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.pregnancyProblemsDetails || ''}
            onChangeText={(value) => updateField('pregnancyProblemsDetails', value)}
            placeholder="Please explain"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Children Health Problems */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do any of your children have serious health problems? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.childrenHealthProblems === true && styles.radioButtonSelected]}
            onPress={() => updateField('childrenHealthProblems', true)}
          >
            <Text style={[styles.radioText, applicationData.childrenHealthProblems === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.childrenHealthProblems === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('childrenHealthProblems', false);
              updateField('childrenHealthDetails', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.childrenHealthProblems === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.childrenHealthProblems && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>If yes, please explain *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.childrenHealthDetails || ''}
            onChangeText={(value) => updateField('childrenHealthDetails', value)}
            placeholder="Please explain"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Breastfeeding */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you currently breastfeeding? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.breastfeeding === true && styles.radioButtonSelected]}
            onPress={() => updateField('breastfeeding', true)}
          >
            <Text style={[styles.radioText, applicationData.breastfeeding === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.breastfeeding === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('breastfeeding', false);
              updateField('breastfeedingStopDate', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.breastfeeding === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.breastfeeding && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>If so, when do you plan to stop?</Text>
          <TextInput
            style={styles.input}
            value={applicationData.breastfeedingStopDate || ''}
            onChangeText={(value) => updateField('breastfeedingStopDate', value)}
            placeholder="Expected stop date"
          />
        </View>
      )}

      {/* Surgeries & Illnesses */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever had any surgery? *</Text>
        <View style={styles.radioContainer}>
            <TouchableOpacity
            style={[styles.radioButton, applicationData.surgeries === true && styles.radioButtonSelected]}
            onPress={() => updateField('surgeries', true)}
            >
            <Text style={[styles.radioText, applicationData.surgeries === true && styles.radioTextSelected]}>YES</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.surgeries === false && styles.radioButtonSelected]}
            onPress={() => updateField('surgeries', false)}
          >
            <Text style={[styles.radioText, applicationData.surgeries === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.surgeries && (
      <View style={styles.inputGroup}>
          <Text style={styles.label}>Reason and results?</Text>
        <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.surgeryDetails || ''}
            onChangeText={(value) => updateField('surgeryDetails', value)}
            placeholder="Surgery details"
            multiline
            numberOfLines={3}
        />
      </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>List any serious illnesses you have</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.seriousIllnesses || ''}
          onChangeText={(value) => updateField('seriousIllnesses', value)}
          placeholder="Serious illnesses (or N/A)"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>List all hospitalizations (except for childbirth)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.hospitalizations || ''}
          onChangeText={(value) => updateField('hospitalizations', value)}
          placeholder="Hospitalizations (or N/A)"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>List all medications that you are presently taking and for what reason</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.currentMedications || ''}
          onChangeText={(value) => updateField('currentMedications', value)}
          placeholder="Medications and reasons (or N/A)"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Tattoos and Piercings */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you had a tattoo or body piercing in the last year and a half? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.tattoosPiercings === true && styles.radioButtonSelected]}
            onPress={() => updateField('tattoosPiercings', true)}
          >
            <Text style={[styles.radioText, applicationData.tattoosPiercings === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.tattoosPiercings === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('tattoosPiercings', false);
              updateField('tattoosPiercingsDate', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.tattoosPiercings === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.tattoosPiercings && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>If yes, when? *</Text>
          <TextInput
            style={styles.input}
            value={applicationData.tattoosPiercingsDate || ''}
            onChangeText={(value) => updateField('tattoosPiercingsDate', value)}
            placeholder="Date (MM/DD/YYYY)"
          />
        </View>
      )}

      {/* Mental Health */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever been seen by a professional for mental health issues? *</Text>
        <View style={styles.radioContainer}>
            <TouchableOpacity
            style={[styles.radioButton, applicationData.mentalHealthTreatment === true && styles.radioButtonSelected]}
            onPress={() => updateField('mentalHealthTreatment', true)}
            >
            <Text style={[styles.radioText, applicationData.mentalHealthTreatment === true && styles.radioTextSelected]}>YES</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.mentalHealthTreatment === false && styles.radioButtonSelected]}
            onPress={() => updateField('mentalHealthTreatment', false)}
          >
            <Text style={[styles.radioText, applicationData.mentalHealthTreatment === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.mentalHealthTreatment && (
      <View style={styles.inputGroup}>
          <Text style={styles.label}>Please explain and list time periods</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
            value={applicationData.mentalHealthDetails || ''}
            onChangeText={(value) => updateField('mentalHealthDetails', value)}
            placeholder="Details and time periods"
          multiline
          numberOfLines={3}
        />
      </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever experienced any postpartum depression? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.postpartumDepression === true && styles.radioButtonSelected]}
            onPress={() => updateField('postpartumDepression', true)}
          >
            <Text style={[styles.radioText, applicationData.postpartumDepression === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.postpartumDepression === false && styles.radioButtonSelected]}
            onPress={() => updateField('postpartumDepression', false)}
          >
            <Text style={[styles.radioText, applicationData.postpartumDepression === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
    </View>
      </View>

      {applicationData.postpartumDepression && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Please give the details and time periods</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.postpartumDepressionDetails || ''}
            onChangeText={(value) => updateField('postpartumDepressionDetails', value)}
            placeholder="Details and time periods"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Depression Medication */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever been prescribed any medication for depression or mental health? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.depressionMedication === true && styles.radioButtonSelected]}
            onPress={() => updateField('depressionMedication', true)}
          >
            <Text style={[styles.radioText, applicationData.depressionMedication === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.depressionMedication === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('depressionMedication', false);
              updateField('depressionMedicationDetails', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.depressionMedication === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.depressionMedication && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>If yes, please list medication name, reason for use and dates of use *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.depressionMedicationDetails || ''}
            onChangeText={(value) => updateField('depressionMedicationDetails', value)}
            placeholder="Medication name, reason, and dates of use"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Drug or Alcohol Abuse */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever had any problems with drug or alcohol abuse? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.drugAlcoholAbuse === true && styles.radioButtonSelected]}
            onPress={() => updateField('drugAlcoholAbuse', true)}
          >
            <Text style={[styles.radioText, applicationData.drugAlcoholAbuse === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.drugAlcoholAbuse === false && styles.radioButtonSelected]}
            onPress={() => updateField('drugAlcoholAbuse', false)}
          >
            <Text style={[styles.radioText, applicationData.drugAlcoholAbuse === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Excess Heat */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you exposed to excess heat in the way of saunas, hot tubs and/or steam rooms? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.excessHeat === true && styles.radioButtonSelected]}
            onPress={() => updateField('excessHeat', true)}
          >
            <Text style={[styles.radioText, applicationData.excessHeat === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.excessHeat === false && styles.radioButtonSelected]}
            onPress={() => updateField('excessHeat', false)}
          >
            <Text style={[styles.radioText, applicationData.excessHeat === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Alcohol Limit Advised */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever been advised to limit your use of alcohol or any other drug? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.alcoholLimitAdvised === true && styles.radioButtonSelected]}
            onPress={() => updateField('alcoholLimitAdvised', true)}
          >
            <Text style={[styles.radioText, applicationData.alcoholLimitAdvised === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.alcoholLimitAdvised === false && styles.radioButtonSelected]}
            onPress={() => updateField('alcoholLimitAdvised', false)}
          >
            <Text style={[styles.radioText, applicationData.alcoholLimitAdvised === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vaccinations */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you been vaccinated for Hepatitis B? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.hepatitisBVaccinated === true && styles.radioButtonSelected]}
            onPress={() => updateField('hepatitisBVaccinated', true)}
          >
            <Text style={[styles.radioText, applicationData.hepatitisBVaccinated === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.hepatitisBVaccinated === false && styles.radioButtonSelected]}
            onPress={() => updateField('hepatitisBVaccinated', false)}
          >
            <Text style={[styles.radioText, applicationData.hepatitisBVaccinated === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you have any allergies? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.allergies === true && styles.radioButtonSelected]}
            onPress={() => updateField('allergies', true)}
          >
            <Text style={[styles.radioText, applicationData.allergies === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.allergies === false && styles.radioButtonSelected]}
            onPress={() => updateField('allergies', false)}
          >
            <Text style={[styles.radioText, applicationData.allergies === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.allergies && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Please explain in detail</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.allergiesDetails || ''}
            onChangeText={(value) => updateField('allergiesDetails', value)}
            placeholder="Allergy details"
            multiline
            numberOfLines={2}
          />
        </View>
      )}
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Sexual History</Text>
      <Text style={styles.stepDescription}>Please provide your sexual health information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>List any contraceptives you have used in the past and any reaction you have had to the use of the contraceptive including Tubal Ligation. *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.pastContraceptives || ''}
          onChangeText={(value) => updateField('pastContraceptives', value)}
          placeholder="List contraceptives used, reactions, and Tubal Ligation if applicable"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you currently using birth control? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.currentBirthControl === true && styles.radioButtonSelected]}
            onPress={() => updateField('currentBirthControl', true)}
          >
            <Text style={[styles.radioText, applicationData.currentBirthControl === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.currentBirthControl === false && styles.radioButtonSelected]}
            onPress={() => updateField('currentBirthControl', false)}
          >
            <Text style={[styles.radioText, applicationData.currentBirthControl === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.currentBirthControl && (
        <>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Which method do you use?</Text>
            <TextInput
              style={styles.input}
              value={applicationData.birthControlMethod || ''}
              onChangeText={(value) => updateField('birthControlMethod', value)}
              placeholder="Birth control method"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>How long have you been using this method?</Text>
            <TextInput
              style={styles.input}
              value={applicationData.birthControlDuration || ''}
              onChangeText={(value) => updateField('birthControlDuration', value)}
              placeholder="Duration"
            />
          </View>
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you with a sexual partner now? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.sexualPartner === true && styles.radioButtonSelected]}
            onPress={() => updateField('sexualPartner', true)}
          >
            <Text style={[styles.radioText, applicationData.sexualPartner === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.sexualPartner === false && styles.radioButtonSelected]}
            onPress={() => updateField('sexualPartner', false)}
          >
            <Text style={[styles.radioText, applicationData.sexualPartner === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you currently have more than one sexual partner? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.multiplePartners === true && styles.radioButtonSelected]}
            onPress={() => updateField('multiplePartners', true)}
          >
            <Text style={[styles.radioText, applicationData.multiplePartners === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.multiplePartners === false && styles.radioButtonSelected]}
            onPress={() => updateField('multiplePartners', false)}
          >
            <Text style={[styles.radioText, applicationData.multiplePartners === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How many sexual partners have you had in the last three years? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.partnersLastThreeYears || ''}
          onChangeText={(value) => updateField('partnersLastThreeYears', value)}
          placeholder="Number of partners"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>In the past 10 years have you had sexual contact with anyone in a high-risk group for HIV or AIDS? *</Text>
        <Text style={styles.subLabel}>Including sexually active partners with multiple partners and partners who have used illegal drugs</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.highRiskHIVContact === true && styles.radioButtonSelected]}
            onPress={() => updateField('highRiskHIVContact', true)}
          >
            <Text style={[styles.radioText, applicationData.highRiskHIVContact === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.highRiskHIVContact === false && styles.radioButtonSelected]}
            onPress={() => updateField('highRiskHIVContact', false)}
          >
            <Text style={[styles.radioText, applicationData.highRiskHIVContact === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you at risk for HIV or AIDS? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.hivRisk === true && styles.radioButtonSelected]}
            onPress={() => updateField('hivRisk', true)}
          >
            <Text style={[styles.radioText, applicationData.hivRisk === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.hivRisk === false && styles.radioButtonSelected]}
            onPress={() => updateField('hivRisk', false)}
          >
            <Text style={[styles.radioText, applicationData.hivRisk === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever received a blood transfusion? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.bloodTransfusion === true && styles.radioButtonSelected]}
            onPress={() => updateField('bloodTransfusion', true)}
          >
            <Text style={[styles.radioText, applicationData.bloodTransfusion === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.bloodTransfusion === false && styles.radioButtonSelected]}
            onPress={() => updateField('bloodTransfusion', false)}
          >
            <Text style={[styles.radioText, applicationData.bloodTransfusion === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever had or have a sexually transmitted infection or disease? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.stdHistory === true && styles.radioButtonSelected]}
            onPress={() => updateField('stdHistory', true)}
          >
            <Text style={[styles.radioText, applicationData.stdHistory === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.stdHistory === false && styles.radioButtonSelected]}
            onPress={() => updateField('stdHistory', false)}
          >
            <Text style={[styles.radioText, applicationData.stdHistory === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.stdHistory && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Please explain</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.stdDetails || ''}
            onChangeText={(value) => updateField('stdDetails', value)}
            placeholder="STD/STI details"
            multiline
            numberOfLines={3}
          />
        </View>
      )}
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Employment Information</Text>
      <Text style={styles.stepDescription}>Please provide your employment details</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Please list your current place of employment. Include (1) position held, (2) date of employment and (3) location of employer. If not applicable please state "N/A" *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.currentEmployment || ''}
          onChangeText={(value) => updateField('currentEmployment', value)}
          placeholder="Position, start date, employer location (or N/A)"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>What is your current monthly income? *</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, marginRight: 5, color: '#333' }}>$</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={applicationData.monthlyIncome || ''}
            onChangeText={(value) => updateField('monthlyIncome', value)}
            placeholder="Monthly income (USD)"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Spouse/Partner Employment - Only show if married */}
      {(applicationData.isMarried === true || applicationData.maritalStatus === 'married') && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Please list your husband/partner's current place of employment. Include (1) position held, (2) date of employment and (3) location of employer. If not applicable please state "N/A" *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={applicationData.spouseEmployment || ''}
              onChangeText={(value) => updateField('spouseEmployment', value)}
              placeholder="Position, start date, employer location (or N/A)"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What is your Spouse's/Partner's current monthly income? *</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginRight: 5, color: '#333' }}>$</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={applicationData.spouseMonthlyIncome || ''}
                onChangeText={(value) => updateField('spouseMonthlyIncome', value)}
                placeholder="Monthly income (USD)"
                keyboardType="numeric"
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How many persons do you support including yourself? *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.personsSupported || ''}
          onChangeText={(value) => updateField('personsSupported', value)}
          placeholder="Number of persons"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you receiving food stamps or any other public assistance? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.publicAssistance === true && styles.radioButtonSelected]}
            onPress={() => updateField('publicAssistance', true)}
          >
            <Text style={[styles.radioText, applicationData.publicAssistance === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.publicAssistance === false && styles.radioButtonSelected]}
            onPress={() => updateField('publicAssistance', false)}
          >
            <Text style={[styles.radioText, applicationData.publicAssistance === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How many people are currently living in your home? *</Text>
        <Text style={styles.subLabel}>If other than your children, husband/spouse, who are they?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.householdMembers || ''}
          onChangeText={(value) => updateField('householdMembers', value)}
          placeholder="Number and description of household members"
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );

  const renderStep6 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Education History</Text>
      <Text style={styles.stepDescription}>Please provide your education background</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What was your highest level of education obtained? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.educationLevel === 'highSchool' && styles.radioButtonSelected]}
            onPress={() => updateField('educationLevel', 'highSchool')}
          >
            <Text style={[styles.radioText, applicationData.educationLevel === 'highSchool' && styles.radioTextSelected]}>High School</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.educationLevel === 'college' && styles.radioButtonSelected]}
            onPress={() => updateField('educationLevel', 'college')}
          >
            <Text style={[styles.radioText, applicationData.educationLevel === 'college' && styles.radioTextSelected]}>College</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Referral Code */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Referral Code (Optional)</Text>
        <Text style={styles.subLabel}>If you were referred by someone, enter their invite code</Text>
        <TextInput
          style={styles.input}
          value={applicationData.referralCode || ''}
          onChangeText={(value) => updateField('referralCode', value)}
          placeholder="Enter referral code (optional)"
          autoCapitalize="none"
        />
      </View>
    </ScrollView>
  );

  const renderStep7 = () => {
    const concernOptions = [
      'Medical procedures',
      'Pregnancy risks',
      'Time commitment',
      'Impact on my family',
      'Emotional challenges',
      'Legal issues',
      'Compensation and payments got paid on time',
      'Communication with intended parents',
      'agency can provide timely support when needed'
    ];

    const toggleConcern = (concern) => {
      const currentConcerns = applicationData.mainConcerns || [];
      if (currentConcerns.includes(concern)) {
        updateField('mainConcerns', currentConcerns.filter(c => c !== concern));
      } else {
        updateField('mainConcerns', [...currentConcerns, concern]);
      }
    };

    return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>General Questions</Text>
      <Text style={styles.stepDescription}>Please answer the following questions</Text>

      {/* Main Concerns */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What are your main concerns about the surrogacy process? *</Text>
        {concernOptions.map((concern, index) => {
          const isSelected = (applicationData.mainConcerns || []).includes(concern);
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.checkboxContainer,
                isSelected && styles.checkboxSelected
              ]}
              onPress={() => toggleConcern(concern)}
            >
              <Text style={[styles.checkboxText, isSelected && styles.checkboxTextSelected]}>
                {isSelected ? '✓ ' : '○ '}{concern}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Parent Qualities */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What qualities if any would you consider most important that the parents you choose will have? *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.parentQualities || ''}
          onChangeText={(value) => updateField('parentQualities', value)}
          placeholder="Describe important qualities in intended parents"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Religious Preference */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you have any preferences for the religious background of the parents? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.religiousPreference === true && styles.radioButtonSelected]}
            onPress={() => updateField('religiousPreference', true)}
          >
            <Text style={[styles.radioText, applicationData.religiousPreference === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.religiousPreference === false && styles.radioButtonSelected]}
            onPress={() => updateField('religiousPreference', false)}
          >
            <Text style={[styles.radioText, applicationData.religiousPreference === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Unmarried Couple */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with an unmarried couple or person? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.unmarriedCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('unmarriedCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.unmarriedCouple === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.unmarriedCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('unmarriedCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.unmarriedCouple === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Heterosexual Couple */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with a heterosexual couple? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.heterosexualCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('heterosexualCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.heterosexualCouple === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.heterosexualCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('heterosexualCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.heterosexualCouple === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Briefly explain your understanding of what being a gestational carrier will entail and your motivation for becoming a surrogate mother *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.surrogacyUnderstanding || ''}
          onChangeText={(value) => updateField('surrogacyUnderstanding', value)}
          placeholder="Your understanding and motivation"
          multiline
          numberOfLines={5}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Generally please introduce yourself: personality, hobbies, interests, family support *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.selfIntroduction || ''}
          onChangeText={(value) => updateField('selfIntroduction', value)}
          placeholder="Tell us about yourself"
          multiline
          numberOfLines={5}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>What kind of support do you expect to have while being a gestational carrier from intended parents and our agency? *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.expectedSupport || ''}
          onChangeText={(value) => updateField('expectedSupport', value)}
          placeholder="Please be specific"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How does your husband/partner feel about your participating in the surrogacy process? *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.partnerFeelings || ''}
          onChangeText={(value) => updateField('partnerFeelings', value)}
          placeholder="Partner's feelings about surrogacy"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Egg Donor */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with a couple using an egg donor? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.eggDonor === true && styles.radioButtonSelected]}
            onPress={() => updateField('eggDonor', true)}
          >
            <Text style={[styles.radioText, applicationData.eggDonor === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.eggDonor === false && styles.radioButtonSelected]}
            onPress={() => updateField('eggDonor', false)}
          >
            <Text style={[styles.radioText, applicationData.eggDonor === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sperm Donor */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with a couple using a sperm donor? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.spermDonor === true && styles.radioButtonSelected]}
            onPress={() => updateField('spermDonor', true)}
          >
            <Text style={[styles.radioText, applicationData.spermDonor === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.spermDonor === false && styles.radioButtonSelected]}
            onPress={() => updateField('spermDonor', false)}
          >
            <Text style={[styles.radioText, applicationData.spermDonor === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Older Couple */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with an older couple? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.olderCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('olderCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.olderCouple === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.olderCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('olderCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.olderCouple === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Couple With Children */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with a couple with children? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.coupleWithChildren === true && styles.radioButtonSelected]}
            onPress={() => updateField('coupleWithChildren', true)}
          >
            <Text style={[styles.radioText, applicationData.coupleWithChildren === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.coupleWithChildren === false && styles.radioButtonSelected]}
            onPress={() => updateField('coupleWithChildren', false)}
          >
            <Text style={[styles.radioText, applicationData.coupleWithChildren === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Working Preferences */}
      <Text style={[styles.label, { marginTop: 20, marginBottom: 10, fontSize: 16, fontWeight: 'bold' }]}>Working Preferences</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with a same sex couple? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.sameSexCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('sameSexCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.sameSexCouple === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.sameSexCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('sameSexCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.sameSexCouple === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with a single male? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.singleMale === true && styles.radioButtonSelected]}
            onPress={() => updateField('singleMale', true)}
          >
            <Text style={[styles.radioText, applicationData.singleMale === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.singleMale === false && styles.radioButtonSelected]}
            onPress={() => updateField('singleMale', false)}
          >
            <Text style={[styles.radioText, applicationData.singleMale === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with a single female? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.singleFemale === true && styles.radioButtonSelected]}
            onPress={() => updateField('singleFemale', true)}
          >
            <Text style={[styles.radioText, applicationData.singleFemale === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.singleFemale === false && styles.radioButtonSelected]}
            onPress={() => updateField('singleFemale', false)}
          >
            <Text style={[styles.radioText, applicationData.singleFemale === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with an international couple? (a couple living outside of the United States) *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.internationalCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('internationalCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.internationalCouple === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.internationalCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('internationalCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.internationalCouple === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Non-English Speaking */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to work with a non-English speaking couple using a translator? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.nonEnglishSpeaking === true && styles.radioButtonSelected]}
            onPress={() => updateField('nonEnglishSpeaking', true)}
          >
            <Text style={[styles.radioText, applicationData.nonEnglishSpeaking === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.nonEnglishSpeaking === false && styles.radioButtonSelected]}
            onPress={() => updateField('nonEnglishSpeaking', false)}
          >
            <Text style={[styles.radioText, applicationData.nonEnglishSpeaking === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you willing to carry twins? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.carryTwins === true && styles.radioButtonSelected]}
            onPress={() => updateField('carryTwins', true)}
          >
            <Text style={[styles.radioText, applicationData.carryTwins === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.carryTwins === false && styles.radioButtonSelected]}
            onPress={() => updateField('carryTwins', false)}
          >
            <Text style={[styles.radioText, applicationData.carryTwins === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reduction Willing */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>In the case of a multiples pregnancy, are you willing to reduce the pregnancy from 3 to 2 or 1? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.reductionWilling === true && styles.radioButtonSelected]}
            onPress={() => updateField('reductionWilling', true)}
          >
            <Text style={[styles.radioText, applicationData.reductionWilling === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.reductionWilling === false && styles.radioButtonSelected]}
            onPress={() => updateField('reductionWilling', false)}
          >
            <Text style={[styles.radioText, applicationData.reductionWilling === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Amniocentesis */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Would you be willing to undergo amniocentesis or other diagnostic testing to determine the presence of birth defects? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.amniocentesis === true && styles.radioButtonSelected]}
            onPress={() => updateField('amniocentesis', true)}
          >
            <Text style={[styles.radioText, applicationData.amniocentesis === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.amniocentesis === false && styles.radioButtonSelected]}
            onPress={() => updateField('amniocentesis', false)}
          >
            <Text style={[styles.radioText, applicationData.amniocentesis === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Abortion Willing */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>If there were a serious problem with the fetus and the parents wanted to abort would you be willing to abort in the presence of birth defects? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.abortionWilling === true && styles.radioButtonSelected]}
            onPress={() => updateField('abortionWilling', true)}
          >
            <Text style={[styles.radioText, applicationData.abortionWilling === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.abortionWilling === false && styles.radioButtonSelected]}
            onPress={() => updateField('abortionWilling', false)}
          >
            <Text style={[styles.radioText, applicationData.abortionWilling === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Concerns Placing Baby */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you have any concerns about placing the baby with the parents after you give birth? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.concernsPlacingBaby === true && styles.radioButtonSelected]}
            onPress={() => updateField('concernsPlacingBaby', true)}
          >
            <Text style={[styles.radioText, applicationData.concernsPlacingBaby === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.concernsPlacingBaby === false && styles.radioButtonSelected]}
            onPress={() => updateField('concernsPlacingBaby', false)}
          >
            <Text style={[styles.radioText, applicationData.concernsPlacingBaby === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you willing to receive injections, medications, and ultrasounds as required? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.receiveInjections === true && styles.radioButtonSelected]}
            onPress={() => updateField('receiveInjections', true)}
          >
            <Text style={[styles.radioText, applicationData.receiveInjections === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.receiveInjections === false && styles.radioButtonSelected]}
            onPress={() => updateField('receiveInjections', false)}
          >
            <Text style={[styles.radioText, applicationData.receiveInjections === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Medical Examinations */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you willing to undergo all medical examinations designated by the doctor? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.medicalExaminations === true && styles.radioButtonSelected]}
            onPress={() => updateField('medicalExaminations', true)}
          >
            <Text style={[styles.radioText, applicationData.medicalExaminations === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.medicalExaminations === false && styles.radioButtonSelected]}
            onPress={() => updateField('medicalExaminations', false)}
          >
            <Text style={[styles.radioText, applicationData.medicalExaminations === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you able to attend all prenatal check-ups on time? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.attendCheckups === true && styles.radioButtonSelected]}
            onPress={() => updateField('attendCheckups', true)}
          >
            <Text style={[styles.radioText, applicationData.attendCheckups === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.attendCheckups === false && styles.radioButtonSelected]}
            onPress={() => updateField('attendCheckups', false)}
          >
            <Text style={[styles.radioText, applicationData.attendCheckups === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you willing to avoid long-distance travel during pregnancy? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.avoidLongTravel === true && styles.radioButtonSelected]}
            onPress={() => updateField('avoidLongTravel', true)}
          >
            <Text style={[styles.radioText, applicationData.avoidLongTravel === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.avoidLongTravel === false && styles.radioButtonSelected]}
            onPress={() => updateField('avoidLongTravel', false)}
          >
            <Text style={[styles.radioText, applicationData.avoidLongTravel === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Follow Guidelines */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you able to follow pregnancy-related lifestyle guidelines? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.followGuidelines === true && styles.radioButtonSelected]}
            onPress={() => updateField('followGuidelines', true)}
          >
            <Text style={[styles.radioText, applicationData.followGuidelines === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.followGuidelines === false && styles.radioButtonSelected]}
            onPress={() => updateField('followGuidelines', false)}
          >
            <Text style={[styles.radioText, applicationData.followGuidelines === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Avoid High Risk Work */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you willing to refrain from high-risk work during pregnancy? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.avoidHighRiskWork === true && styles.radioButtonSelected]}
            onPress={() => updateField('avoidHighRiskWork', true)}
          >
            <Text style={[styles.radioText, applicationData.avoidHighRiskWork === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.avoidHighRiskWork === false && styles.radioButtonSelected]}
            onPress={() => updateField('avoidHighRiskWork', false)}
          >
            <Text style={[styles.radioText, applicationData.avoidHighRiskWork === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Placed Child Adoption */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever placed a child up for adoption? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.placedChildAdoption === true && styles.radioButtonSelected]}
            onPress={() => updateField('placedChildAdoption', true)}
          >
            <Text style={[styles.radioText, applicationData.placedChildAdoption === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.placedChildAdoption === false && styles.radioButtonSelected]}
            onPress={() => updateField('placedChildAdoption', false)}
          >
            <Text style={[styles.radioText, applicationData.placedChildAdoption === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Will you permit the parents in the delivery room? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsInDeliveryRoom === true && styles.radioButtonSelected]}
            onPress={() => updateField('parentsInDeliveryRoom', true)}
          >
            <Text style={[styles.radioText, applicationData.parentsInDeliveryRoom === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsInDeliveryRoom === false && styles.radioButtonSelected]}
            onPress={() => updateField('parentsInDeliveryRoom', false)}
          >
            <Text style={[styles.radioText, applicationData.parentsInDeliveryRoom === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Will you permit the parents to attend doctor appointments if they want to attend? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsAtAppointments === true && styles.radioButtonSelected]}
            onPress={() => updateField('parentsAtAppointments', true)}
          >
            <Text style={[styles.radioText, applicationData.parentsAtAppointments === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsAtAppointments === false && styles.radioButtonSelected]}
            onPress={() => updateField('parentsAtAppointments', false)}
          >
            <Text style={[styles.radioText, applicationData.parentsAtAppointments === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notify Hospital */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Will you permit the parents to notify the hospital that you are not the biological parent of the child? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.notifyHospital === true && styles.radioButtonSelected]}
            onPress={() => updateField('notifyHospital', true)}
          >
            <Text style={[styles.radioText, applicationData.notifyHospital === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.notifyHospital === false && styles.radioButtonSelected]}
            onPress={() => updateField('notifyHospital', false)}
          >
            <Text style={[styles.radioText, applicationData.notifyHospital === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Parents On Birth Certificate */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Will you allow the parents' names to be placed on the birth certificate? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsOnBirthCertificate === true && styles.radioButtonSelected]}
            onPress={() => updateField('parentsOnBirthCertificate', true)}
          >
            <Text style={[styles.radioText, applicationData.parentsOnBirthCertificate === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsOnBirthCertificate === false && styles.radioButtonSelected]}
            onPress={() => updateField('parentsOnBirthCertificate', false)}
          >
            <Text style={[styles.radioText, applicationData.parentsOnBirthCertificate === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Applying Elsewhere */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Are you currently applying to be a gestational carrier at any other medical facility, agency, and facilitator, or independently? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.applyingElsewhere === true && styles.radioButtonSelected]}
            onPress={() => updateField('applyingElsewhere', true)}
          >
            <Text style={[styles.radioText, applicationData.applyingElsewhere === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.applyingElsewhere === false && styles.radioButtonSelected]}
            onPress={() => updateField('applyingElsewhere', false)}
          >
            <Text style={[styles.radioText, applicationData.applyingElsewhere === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rejected Elsewhere */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Have you ever applied to be a gestational carrier at any other medical facility and been told that you do not meet the criteria to be a gestational carrier? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.rejectedElsewhere === true && styles.radioButtonSelected]}
            onPress={() => updateField('rejectedElsewhere', true)}
          >
            <Text style={[styles.radioText, applicationData.rejectedElsewhere === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.rejectedElsewhere === false && styles.radioButtonSelected]}
            onPress={() => updateField('rejectedElsewhere', false)}
          >
            <Text style={[styles.radioText, applicationData.rejectedElsewhere === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How much contact would you like to have with the parents throughout the process?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.contactDuringProcess || ''}
          onChangeText={(value) => updateField('contactDuringProcess', value)}
          placeholder="Describe your preferred level of contact"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How much contact would you like to have with the parents after the birth?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.contactAfterBirth || ''}
          onChangeText={(value) => updateField('contactAfterBirth', value)}
          placeholder="Describe your preferred level of contact after birth"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Unsupportive People */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Is there anyone important in your life that is not supportive of you considering becoming a gestational surrogate? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.unsupportivePeople === true && styles.radioButtonSelected]}
            onPress={() => updateField('unsupportivePeople', true)}
          >
            <Text style={[styles.radioText, applicationData.unsupportivePeople === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.unsupportivePeople === false && styles.radioButtonSelected]}
            onPress={() => updateField('unsupportivePeople', false)}
          >
            <Text style={[styles.radioText, applicationData.unsupportivePeople === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Childcare Support */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Do you feel like you will have the necessary support to be able to find adequate child care for all appointments you will be required to attend? *</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.childcareSupport === true && styles.radioButtonSelected]}
            onPress={() => updateField('childcareSupport', true)}
          >
            <Text style={[styles.radioText, applicationData.childcareSupport === true && styles.radioTextSelected]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.childcareSupport === false && styles.radioButtonSelected]}
            onPress={() => updateField('childcareSupport', false)}
          >
            <Text style={[styles.radioText, applicationData.childcareSupport === false && styles.radioTextSelected]}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    );
  };

  const renderStep8 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Authorization for Release of Information</Text>
      <Text style={styles.stepDescription}>Please review and confirm</Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { lineHeight: 22 }]}>
          I hereby authorize Babytree Surrogacy to disclose the information contained in this Surrogate Application to anyone interested in reviewing my application to assist them in selecting a Surrogate, and for review by appropriate medical and psychological professionals and their staffs. I understand, and expressly condition this authorization upon such understanding.
        </Text>
        <View style={[styles.radioContainer, { marginTop: 15 }]}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.authorizationAgreed === true && styles.radioButtonSelected, { paddingVertical: 15, paddingHorizontal: 25 }]}
            onPress={() => updateField('authorizationAgreed', true)}
          >
            <Text style={[styles.radioText, applicationData.authorizationAgreed === true && styles.radioTextSelected]}>I Agree</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Applicant Information */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Applicant Name *</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={applicationData.firstName || ''}
            placeholder="First Name"
            editable={false}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={applicationData.lastName || ''}
            placeholder="Last Name"
            editable={false}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Application Date</Text>
        <TextInput
          style={styles.input}
          value={new Date().toLocaleDateString('en-US')}
          editable={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Applicant Email *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.email || ''}
          placeholder="Email"
          editable={false}
        />
    </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Applicant Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.phoneNumber || ''}
          placeholder="Phone"
          editable={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Emergency Contact person's name, relationship and Phone Number *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.emergencyContact || ''}
          onChangeText={(value) => updateField('emergencyContact', value)}
          placeholder="Name, Relationship, Phone Number"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={[styles.inputGroup, { marginTop: 20, padding: 15, backgroundColor: '#FFF3CD', borderRadius: 12 }]}>
        <Text style={{ color: '#856404', fontSize: 14, lineHeight: 20 }}>
          By submitting this application, you confirm that all information provided is true and accurate to the best of your knowledge.
        </Text>
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
            <Text style={styles.title}>{editMode ? t('application.editTitle') : t('application.title')}</Text>
            <Text style={styles.subtitle}>{editMode ? t('application.editSubtitle') : t('application.subtitle')}</Text>
          
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
  checkboxContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E7EE',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  checkboxSelected: {
    borderColor: '#2A7BF6',
    backgroundColor: '#E8F2FF',
  },
  checkboxText: {
    fontSize: 15,
    color: '#1A1D1E',
  },
  checkboxTextSelected: {
    color: '#2A7BF6',
    fontWeight: '600',
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

