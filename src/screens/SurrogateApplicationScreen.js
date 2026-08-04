import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, StatusBar, TouchableWithoutFeedback, Keyboard, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { translateFormUi } from '../i18n/formUiStrings';
import { extractLocationFromAddress, sanitizeAddressText } from '../utils/extractLocationFromAddress';
import { getClientIpInfo } from '../utils/getClientIp';
import DatePickerField from '../components/DatePickerField';
import { splitAirportFields } from '../utils/splitAirportFields';
import {
  getSurrogateDraftKey,
  buildDraftEnvelope,
  saveApplicationDraft,
  clearApplicationDraft,
  loadBestApplicationDraft,
  persistDraftForAuthHandoff,
  consolidateDraftToUser,
  PENDING_SURROGATE_DRAFT_KEY,
} from '../utils/applicationDraft';

/** Parse MM/DD/YYYY, M/D/YYYY, YYYY-MM-DD, or YYYY/MM/DD into month/day/year parts. */
function parseDateOfBirthParts(raw) {
  const s = String(raw || '').trim();
  if (!s) return { month: '', day: '', year: '' };

  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    return {
      month: String(parseInt(m[2], 10)),
      day: String(parseInt(m[3], 10)),
      year: m[1],
    };
  }

  m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (m) {
    return {
      month: String(parseInt(m[1], 10)),
      day: String(parseInt(m[2], 10)),
      year: m[3],
    };
  }

  return { month: '', day: '', year: '' };
}

function applyAirportFields(data) {
  if (!data) return data;
  const split = splitAirportFields(data.nearestAirport, data.airportDistance);
  return {
    ...data,
    nearestAirport: split.nearestAirport || '',
    airportDistance: split.airportDistance || '',
  };
}

function applyDateOfBirthParts(data) {
  if (!data) return data;
  const hasParts =
    String(data.dateOfBirthMonth || '').trim() &&
    String(data.dateOfBirthDay || '').trim() &&
    String(data.dateOfBirthYear || '').trim();
  if (hasParts) return data;

  const parts = parseDateOfBirthParts(data.dateOfBirth);
  if (!parts.year) return data;

  const month = String(data.dateOfBirthMonth || parts.month || '').trim() || parts.month;
  const day = String(data.dateOfBirthDay || parts.day || '').trim() || parts.day;
  const year = String(data.dateOfBirthYear || parts.year || '').trim() || parts.year;

  return {
    ...data,
    dateOfBirthMonth: month,
    dateOfBirthDay: day,
    dateOfBirthYear: year,
    dateOfBirth:
      month && day && year
        ? `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
        : data.dateOfBirth,
  };
}

export default function SurrogateApplicationScreen({ navigation, route }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const tf = (text) => translateFormUi(language, text);
  
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
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthPasswordConfirm, setShowAuthPasswordConfirm] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [photos, setPhotos] = useState([]); // Array of {uri, url, fileName, fileSize, uploading}
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState(null);
  const photoUploadTokenRef = useRef({});
  const draftHydratedRef = useRef(false);
  const skipExitPromptRef = useRef(false);
  const applicationDataRef = useRef(null);
  const currentStepRef = useRef(1);
  const photosRef = useRef([]);
  const [applicationData, setApplicationData] = useState(() => {
    const profileName = user?.name || user?.user_metadata?.name || '';
    const nameParts = (() => {
      const parts = String(profileName)
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(Boolean);
      if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
      if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
      if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
      return {
        firstName: parts[0],
        middleName: parts.slice(1, -1).join(' '),
        lastName: parts[parts.length - 1],
      };
    })();
    const initialDob =
      user?.user_metadata?.date_of_birth || user?.dateOfBirth || '';
    const dobParts = parseDateOfBirthParts(initialDob);
    return {
    // Step 1: Personal Information (Extended)
    firstName: nameParts.firstName,
    middleName: nameParts.middleName,
    lastName: nameParts.lastName,
    fullName: profileName,
    age: user?.user_metadata?.age || '',
    dateOfBirth: initialDob,
    dateOfBirthMonth: dobParts.month,
    dateOfBirthDay: dobParts.day,
    dateOfBirthYear: dobParts.year,
    phoneNumber: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    hearAboutUs: user?.user_metadata?.hear_about_us || '',
    race: user?.user_metadata?.race || user?.race || '',
    referralCode: user?.user_metadata?.referred_by || '',
    bloodType: '',
    height: '',
    heightUnit: 'ft_in', // 'ft_in' | 'cm'
    heightFeet: '',
    heightInches: '',
    heightCm: '',
    weight: '',
    weightUnit: 'lbs', // 'lbs' | 'kg'
    weightValue: '',
    significantWeightChange: null, // true/false; null = unanswered (required)
    religiousBackground: '',
    practicingReligion: null,
    usCitizen: null,
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
    divorced: null,
    divorceDate: '',
    divorceCause: '',
    remarried: null,
    remarriedDate: '',
    legallySeparated: null,
    separationDetails: '',
    lifePartner: null,
    partnerName: '',
    partnerDateOfBirth: '',
    engaged: null,
    engagementDate: '',
    weddingDate: '',
    wantMoreChildren: null,
    legalProblems: '',
    jailTime: '',
    nearestAirport: '',
    airportDistance: '',
    pets: '',
    livingSituation: '', // own, family, rent
    ownCar: null,
    driverLicense: null,
    carInsured: null,
    transportationMethod: '',
    siblingsCount: '',
    motherSiblingsCount: '',
    
    // Step 2: Pregnancy & Delivery History
    totalDeliveries: '',
    deliveries: [], // Array of delivery objects (up to 5)
    previousSurrogacy: null,
    previousSurrogacyCount: '',
    
    // Step 3: Health Information (Extended)
    healthInsurance: null,
    maternityCoverage: null, // true | 'not_sure' | null
    insuranceDetails: '',
    stateAgencyInsurance: null,
    stateAgencyName: '',
    insurancePaymentMethod: '', // privately, employer
    deliveryHospital: '',
    deliveredAtHospitalBefore: null,
    abnormalPapSmear: null,
    monthlyCycles: null,
    cycleDays: '',
    periodDays: '',
    lastMenstrualPeriod: '',
    infertilityDoctor: null,
    infertilityDetails: '',
    smokingStatus: '',
    smokedDuringPregnancy: null,
    householdSmoking: null,
    householdSmokingDetails: '',
    householdMarijuana: null,
    alcoholUsage: '',
    alcoholFrequency: '',
    illegalDrugs: null,
    partnerIllegalDrugs: null,
    childrenList: '',
    pregnancyProblems: null,
    pregnancyProblemsDetails: '',
    childrenHealthProblems: null,
    childrenHealthDetails: '',
    breastfeeding: null,
    breastfeedingStopDate: '',
    surgeries: null,
    surgeryDetails: '',
    seriousIllnesses: '',
    hospitalizations: '',
    currentMedications: '',
    tattoosPiercings: null,
    tattoosPiercingsDate: '',
    mentalHealthTreatment: null,
    mentalHealthDetails: '',
    postpartumDepression: null,
    postpartumDepressionDetails: '',
    depressionMedication: null,
    depressionMedicationDetails: '',
    drugAlcoholAbuse: null,
    excessHeat: null,
    allergies: null,
    allergiesDetails: '',
    hepatitisBVaccinated: null,
    alcoholLimitAdvised: null,
    
    // Step 4: Sexual History
    pastContraceptives: '',
    currentBirthControl: null,
    birthControlMethod: '',
    birthControlDuration: '',
    sexualPartner: null,
    multiplePartners: null,
    partnersLastThreeYears: '',
    highRiskHIVContact: null,
    hivRisk: null,
    bloodTransfusion: null,
    stdHistory: null,
    stdDetails: '',
    
    // Step 5: Employment Information
    currentEmployment: '',
    monthlyIncome: '',
    spouseEmployment: '',
    spouseMonthlyIncome: '',
    personsSupported: '',
    publicAssistance: null,
    householdMembers: '',
    
    // Step 6: Education History
    educationLevel: '', // highSchool, college
    tradeSchoolDetails: '',
    
    // Step 7: General Questions & Preferences
    surrogacyUnderstanding: '',
    selfIntroduction: '',
    mainConcerns: [], // Array of concerns
    parentQualities: '',
    religiousPreference: null,
    unmarriedCouple: null,
    heterosexualCouple: null,
    sameSexCouple: null,
    singleMale: null,
    singleFemale: null,
    eggDonor: null,
    spermDonor: null,
    olderCouple: null,
    coupleWithChildren: null,
    internationalCouple: null,
    nonEnglishSpeaking: null,
    carryTwins: null,
    reductionWilling: null,
    amniocentesis: null,
    abortionWilling: null,
    contactDuringProcess: '',
    contactAfterBirth: '',
    concernsPlacingBaby: null,
    parentsInDeliveryRoom: null,
    parentsAtAppointments: null,
    notifyHospital: null,
    parentsOnBirthCertificate: null,
    applyingElsewhere: null,
    rejectedElsewhere: null,
    attendCheckups: null,
    receiveInjections: null,
    medicalExaminations: null,
    followGuidelines: null,
    avoidLongTravel: null,
    avoidHighRiskWork: null,
    placedChildAdoption: null,
    expectedSupport: '',
    unsupportivePeople: null,
    partnerFeelings: '',
    childcareSupport: null,
    compensationExpectations: '',
    timelineAvailability: '',
    travelWillingness: null,
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
    
    // Surrogate Photos (up to 6 lifestyle photos)
    photos: [], // Array of photo URLs
  };
  });

  const composeNameFromParts = (data) =>
    `${data?.firstName || ''} ${data?.middleName || ''} ${data?.lastName || ''}`
      .trim()
      .replace(/\s+/g, ' ');

  /** Split a full legal/display name into first / middle / last for the form row. */
  const splitFullName = (fullName) => {
    const parts = String(fullName || '')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(Boolean);
    if (parts.length === 0) {
      return { firstName: '', middleName: '', lastName: '' };
    }
    if (parts.length === 1) {
      return { firstName: parts[0], middleName: '', lastName: '' };
    }
    if (parts.length === 2) {
      return { firstName: parts[0], middleName: '', lastName: parts[1] };
    }
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  };

  /** Prefer explicit fullName; otherwise build from first/middle/last (UI may show composed name while state.fullName is still empty). */
  const resolveFullName = (data) => {
    const explicit = String(data?.fullName || '').trim().replace(/\s+/g, ' ');
    if (explicit) return explicit;
    return composeNameFromParts(data);
  };

  /** Fill empty first/middle/last from fullName / profile name without overwriting user edits. */
  const applyNamePartsFromFullName = (data, fullNameSource) => {
    const next = { ...data };
    const hasParts =
      String(next.firstName || '').trim() ||
      String(next.middleName || '').trim() ||
      String(next.lastName || '').trim();
    const source =
      String(fullNameSource || next.fullName || '').trim() ||
      composeNameFromParts(next);
    if (!hasParts && source) {
      const parts = splitFullName(source);
      next.firstName = parts.firstName;
      next.middleName = parts.middleName;
      next.lastName = parts.lastName;
    }
    if (!String(next.fullName || '').trim() && source) {
      next.fullName = source;
    }
    return next;
  };

  const composeHeightDisplay = (data) => {
    const unit = data.heightUnit || 'ft_in';
    if (unit === 'cm') {
      const cm = String(data.heightCm || '').trim();
      return cm ? `${cm} cm` : '';
    }
    const feet = String(data.heightFeet || '').trim();
    const inches = String(data.heightInches || '').trim();
    if (!feet && !inches) return '';
    if (feet && inches) return `${feet}'${inches}"`;
    if (feet) return `${feet}'0"`;
    return `0'${inches}"`;
  };

  const composeWeightDisplay = (data) => {
    const unit = data.weightUnit || 'lbs';
    const value = String(data.weightValue || '').trim();
    return value ? `${value} ${unit}` : '';
  };

  /** Fill unit/number fields from legacy free-text height/weight when editing old drafts */
  const hydrateHeightWeightFields = (data) => {
    const next = { ...data };

    const hasHeightParts =
      String(next.heightFeet || '').trim() ||
      String(next.heightInches || '').trim() ||
      String(next.heightCm || '').trim();
    if (!hasHeightParts && next.height) {
      const h = String(next.height).trim();
      const cmMatch = h.match(/^([\d.]+)\s*cm$/i);
      const ftInMatch = h.match(/^(\d+)\s*['′]\s*([\d.]+)?\s*["″]?$/);
      const ftInSpace = h.match(/^(\d+)\s*ft(?:\s*([\d.]+)\s*in)?$/i);
      if (cmMatch) {
        next.heightUnit = 'cm';
        next.heightCm = cmMatch[1];
      } else if (ftInMatch) {
        next.heightUnit = 'ft_in';
        next.heightFeet = ftInMatch[1];
        next.heightInches = ftInMatch[2] || '0';
      } else if (ftInSpace) {
        next.heightUnit = 'ft_in';
        next.heightFeet = ftInSpace[1];
        next.heightInches = ftInSpace[2] || '0';
      }
    }
    if (!next.heightUnit) next.heightUnit = 'ft_in';

    const hasWeightValue = String(next.weightValue || '').trim();
    if (!hasWeightValue && next.weight) {
      const w = String(next.weight).trim();
      const kgMatch = w.match(/^([\d.]+)\s*kg$/i);
      const lbsMatch = w.match(/^([\d.]+)\s*(lbs?|pounds?)$/i);
      const numOnly = w.match(/^([\d.]+)$/);
      if (kgMatch) {
        next.weightUnit = 'kg';
        next.weightValue = kgMatch[1];
      } else if (lbsMatch) {
        next.weightUnit = 'lbs';
        next.weightValue = lbsMatch[1];
      } else if (numOnly) {
        next.weightUnit = next.weightUnit || 'lbs';
        next.weightValue = numOnly[1];
      }
    }
    if (!next.weightUnit) next.weightUnit = 'lbs';

    // Prefer composed display from structured fields when available
    const composedH = composeHeightDisplay(next);
    const composedW = composeWeightDisplay(next);
    if (composedH) next.height = composedH;
    if (composedW) next.weight = composedW;
    return next;
  };

  const updateField = (field, value) => {
    setApplicationData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-sync fullName when firstName, middleName, or lastName changes
      if (field === 'firstName' || field === 'middleName' || field === 'lastName') {
        updated.fullName = composeNameFromParts({
          firstName: field === 'firstName' ? value : prev.firstName,
          middleName: field === 'middleName' ? value : prev.middleName,
          lastName: field === 'lastName' ? value : prev.lastName,
        });
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
      // Auto-sync Month/Day/Year when the full dateOfBirth string is set
      if (field === 'dateOfBirth') {
        const parts = parseDateOfBirthParts(value);
        if (parts.year) {
          updated.dateOfBirthMonth = parts.month;
          updated.dateOfBirthDay = parts.day;
          updated.dateOfBirthYear = parts.year;
        }
      }
      // Auto-sync height display string when unit/parts change
      if (
        field === 'heightUnit' ||
        field === 'heightFeet' ||
        field === 'heightInches' ||
        field === 'heightCm'
      ) {
        updated.height = composeHeightDisplay(updated);
      }
      // Auto-sync weight display string when unit/value change
      if (field === 'weightUnit' || field === 'weightValue') {
        updated.weight = composeWeightDisplay(updated);
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

  // Draft storage helpers — save/resume mid-form on any step
  const getDraftKey = () => getSurrogateDraftKey(user?.id);

  const applyPhotosFromUrls = (urls) => {
    if (!Array.isArray(urls) || urls.length === 0) return;
    setPhotos(
      urls.map((url, idx) => ({
        uri: null,
        url,
        fileName: `IMG_${idx + 1}.jpeg`,
        fileSize: null,
        uploading: false,
      }))
    );
  };

  const applyDraftData = (mergedRaw, step = 1) => {
    const merged = mergedRaw || {};
    setApplicationData((prev) => {
      const next = hydrateHeightWeightFields({ ...prev, ...merged });
      const withNames = applyNamePartsFromFullName(next, next.fullName);
      if (!String(withNames.fullName || '').trim()) {
        withNames.fullName = composeNameFromParts(withNames);
      }
      if (!String(withNames.email || '').trim()) {
        withNames.email = prev.email || user?.email || '';
      }
      return applyAirportFields(applyDateOfBirthParts(withNames));
    });
    if (Array.isArray(merged.photos) && merged.photos.length > 0) {
      applyPhotosFromUrls(merged.photos);
    } else if (merged.photoUrl) {
      applyPhotosFromUrls([merged.photoUrl]);
    }
    const safeStep = Math.min(totalSteps, Math.max(1, Number(step) || 1));
    setTimeout(() => {
      setFormVersion(Date.now());
      setCurrentStep(safeStep);
      draftHydratedRef.current = true;
    }, 0);
  };

  const saveDraftNow = async (overrides = {}) => {
    try {
      const key = overrides.key || getDraftKey();
      const data = overrides.data || applicationDataRef.current;
      const step = overrides.currentStep ?? currentStepRef.current;
      const photoList = overrides.photos || photosRef.current;
      const envelope = buildDraftEnvelope({
        currentStep: step,
        data,
        photos: photoList,
      });
      await saveApplicationDraft(key, envelope);
      return true;
    } catch (err) {
      console.log('⚠️ saveDraftNow error:', err?.message || err);
      return false;
    }
  };

  const loadDraft = async (userIdOverride = null) => {
    try {
      const uid = userIdOverride || user?.id;
      const userKey = getSurrogateDraftKey(uid || null);
      const guestKey = getSurrogateDraftKey(null);

      // Soft-register remounts the navigator: filled step-1 data often still lives
      // on guest/pending keys while this screen only used to read the user key.
      const best = await loadBestApplicationDraft([
        PENDING_SURROGATE_DRAFT_KEY,
        userKey,
        guestKey,
      ]);

      if (best?.draft?.data) {
        applyDraftData(best.draft.data, best.draft.currentStep);
        if (best.draft.photos?.length && !best.draft.data.photos?.length) {
          applyPhotosFromUrls(best.draft.photos);
        }
        if (uid) {
          await consolidateDraftToUser({
            draft: best.draft,
            userKey: getSurrogateDraftKey(uid),
            guestKey,
            pendingKey: PENDING_SURROGATE_DRAFT_KEY,
          });
        }
        return;
      }

      // Logged-in: optional DB prefill only when no local draft (start at step 1)
      if (!uid) {
        draftHydratedRef.current = true;
        return;
      }

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
          // ignore
        }
        const merged = {
          fullName: latest.full_name || parsed.fullName || '',
          phoneNumber: latest.phone || parsed.phoneNumber || '',
          ...parsed,
        };
        applyDraftData(merged, 1);
        return;
      }

      draftHydratedRef.current = true;
    } catch (err) {
      console.log('⚠️ loadDraft error:', err.message);
      draftHydratedRef.current = true;
    }
  };

  useEffect(() => {
    applicationDataRef.current = applicationData;
  }, [applicationData]);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Autosave draft whenever form progress changes
  useEffect(() => {
    if (editMode) return;
    if (!draftHydratedRef.current) return;
    const timer = setTimeout(() => {
      saveDraftNow();
    }, 450);
    return () => clearTimeout(timer);
  }, [applicationData, currentStep, photos, user?.id, editMode]);

  const navigateAfterExit = () => {
    skipExitPromptRef.current = true;
    if (user) {
      navigation.navigate('MainTabs');
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Landing');
    }
  };

  const handleSaveAndExit = async () => {
    if (editMode) {
      navigateAfterExit();
      return;
    }
    const ok = await saveDraftNow();
    Alert.alert(
      ok ? t('application.progressSaved') : t('application.errorSavingProgress'),
      ok ? t('application.progressSavedContinueLater') : t('application.errorSavingProgressMessage'),
      [{ text: t('common.ok'), onPress: navigateAfterExit }]
    );
  };

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (skipExitPromptRef.current || isLoading || editMode) return;
      // Always persist before leaving so user can resume any page
      e.preventDefault();
      (async () => {
        await saveDraftNow();
        skipExitPromptRef.current = true;
        navigation.dispatch(e.data.action);
      })();
    });
    return unsub;
  }, [navigation, isLoading, user?.id, editMode]);

  useEffect(() => {
    if (editMode && existingData) {
      draftHydratedRef.current = true;
      return;
    }
    loadDraft();
  }, [user?.id]);

  // Fallback: when user logs in and has profile/metadata, update form fields directly
  useEffect(() => {
    if (!user) return;
    // Wait for local draft restore after soft-register remount so profile autofill
    // does not briefly replace a richer in-progress form.
    if (!draftHydratedRef.current) return;
    const meta = user.user_metadata || {};
    const profileName = user.name || meta.name || '';
    setApplicationData((prev) => {
      let next = {
        ...prev,
        age: prev.age || meta.age || '',
        dateOfBirth: prev.dateOfBirth || meta.date_of_birth || user.dateOfBirth || '',
        hearAboutUs: prev.hearAboutUs || meta.hear_about_us || '',
        fullName: prev.fullName || profileName,
        phoneNumber: prev.phoneNumber || meta.phone || user.phone || '',
        email: prev.email || user.email || '',
        address: prev.address || meta.address || user.address || '',
        race: prev.race || meta.race || user.race || '',
        referralCode: prev.referralCode || meta.referred_by || '',
      };
      next = applyNamePartsFromFullName(next, profileName);
      return applyDateOfBirthParts(next);
    });
  }, [user?.id, user?.name, user?.user_metadata]);

  useFocusEffect(
    React.useCallback(() => {
      skipExitPromptRef.current = false;
      if (editMode && existingData) {
        console.log('📝 Loading existing application data for editing');
        setApplicationData((prev) => {
          const next = hydrateHeightWeightFields({
            ...prev,
            ...existingData,
          });
          const withNames = applyNamePartsFromFullName(next, next.fullName);
          if (!String(withNames.fullName || '').trim()) {
            withNames.fullName = composeNameFromParts(withNames);
          }
          return applyDateOfBirthParts(withNames);
        });
        if (existingData.photos && Array.isArray(existingData.photos)) {
          applyPhotosFromUrls(existingData.photos);
        } else if (existingData.photoUrl) {
          applyPhotosFromUrls([existingData.photoUrl]);
        }
        draftHydratedRef.current = true;
      } else {
        loadDraft(user?.id || null);
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

  // Upload surrogate photo to Supabase Storage
  const beginPhotoUpload = (index) => {
    const token = (photoUploadTokenRef.current[index] || 0) + 1;
    photoUploadTokenRef.current[index] = token;
    return token;
  };

  const isPhotoUploadCurrent = (index, token) =>
    photoUploadTokenRef.current[index] === token;

  const syncPhotoUrls = (nextPhotos) => {
    const photoUrls = (nextPhotos || []).filter((p) => p && p.url).map((p) => p.url);
    updateField('photos', photoUrls);
  };

  const uploadSurrogatePhoto = async (uri, index, uploadToken) => {
    try {
      if (isPhotoUploadCurrent(index, uploadToken)) {
        setUploadingPhotoIndex(index);
      }
      
      // Check user authentication
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('User not authenticated. Please log in again.');
      }

      if (!isPhotoUploadCurrent(index, uploadToken)) {
        return null;
      }
      
      // Get file extension
      const fileExtension = uri.split('.').pop().toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const ext = validExtensions.includes(fileExtension) ? fileExtension : 'jpg';
      
      // Generate unique filename
      const fileName = `surrogate_${authUser.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `surrogate-photos/${fileName}`;
      
      // Get file size (approximate)
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileSize = blob.size;

      if (!isPhotoUploadCurrent(index, uploadToken)) {
        return null;
      }
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        name: fileName,
      });
      
      // Upload to Supabase Storage - use post-media bucket (same as other uploads)
      // This bucket has proper RLS policies configured
      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(filePath, formData, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: false,
        });
      
      if (error) {
        console.error('Error uploading photo:', error);
        throw error;
      }

      if (!isPhotoUploadCurrent(index, uploadToken)) {
        return null;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('post-media')
        .getPublicUrl(filePath);
      
      return {
        url: urlData.publicUrl,
        fileName: fileName,
        fileSize: fileSize,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      if (isPhotoUploadCurrent(index, uploadToken)) {
        setUploadingPhotoIndex((current) => (current === index ? null : current));
      }
    }
  };

  // Pick image from library (for a specific index)
  const pickPhoto = async (index) => {
    try {
      if (photos.length >= 6 && !photos[index]) {
        Alert.alert(t('common.limitReached'), t('common.photoLimit6'));
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.permissionRequired'), t('common.photoLibraryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedUri = result.assets[0].uri;
        const uploadToken = beginPhotoUpload(index);
        
        // Create temporary photo object
        const tempPhoto = {
          uri: selectedUri,
          url: null,
          fileName: null,
          fileSize: null,
          uploading: true,
        };
        
        setPhotos((prev) => {
          const next = [...prev];
          while (next.length <= index) next.push(null);
          next[index] = tempPhoto;
          return next;
        });
        
        // Upload immediately
        try {
          const uploadResult = await uploadSurrogatePhoto(selectedUri, index, uploadToken);
          if (!uploadResult || !isPhotoUploadCurrent(index, uploadToken)) {
            return;
          }
          const updatedPhoto = {
            uri: selectedUri,
            url: uploadResult.url,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            uploading: false,
          };
          
          setPhotos((prev) => {
            const next = [...prev];
            while (next.length <= index) next.push(null);
            next[index] = updatedPhoto;
            syncPhotoUrls(next);
            return next;
          });
        } catch (error) {
          if (!isPhotoUploadCurrent(index, uploadToken)) {
            return;
          }
          Alert.alert(t('common.uploadFailed'), t('common.uploadPhotoFailed'));
          setPhotos((prev) => {
            const next = [...prev];
            next[index] = null;
            const filtered = next.filter((p) => p !== null);
            syncPhotoUrls(filtered);
            return filtered;
          });
        }
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert(t('common.error'), t('common.pickPhotoFailed'));
    }
  };

  // Take photo with camera (for a specific index)
  const takePhoto = async (index) => {
    try {
      if (photos.length >= 6 && !photos[index]) {
        Alert.alert(t('common.limitReached'), t('common.photoLimit6'));
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.permissionRequired'), t('common.cameraPermission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedUri = result.assets[0].uri;
        const uploadToken = beginPhotoUpload(index);
        
        // Create temporary photo object
        const tempPhoto = {
          uri: selectedUri,
          url: null,
          fileName: null,
          fileSize: null,
          uploading: true,
        };
        
        setPhotos((prev) => {
          const next = [...prev];
          while (next.length <= index) next.push(null);
          next[index] = tempPhoto;
          return next;
        });
        
        // Upload immediately
        try {
          const uploadResult = await uploadSurrogatePhoto(selectedUri, index, uploadToken);
          if (!uploadResult || !isPhotoUploadCurrent(index, uploadToken)) {
            return;
          }
          const updatedPhoto = {
            uri: selectedUri,
            url: uploadResult.url,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            uploading: false,
          };
          
          setPhotos((prev) => {
            const next = [...prev];
            while (next.length <= index) next.push(null);
            next[index] = updatedPhoto;
            syncPhotoUrls(next);
            return next;
          });
        } catch (error) {
          if (!isPhotoUploadCurrent(index, uploadToken)) {
            return;
          }
          Alert.alert(t('common.uploadFailed'), t('common.uploadPhotoFailed'));
          setPhotos((prev) => {
            const next = [...prev];
            next[index] = null;
            const filtered = next.filter((p) => p !== null);
            syncPhotoUrls(filtered);
            return filtered;
          });
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), t('common.takePhotoFailed'));
    }
  };

  // Show image picker options (for a specific index)
  const showPhotoPicker = (index) => {
    Alert.alert(
      t('common.uploadPhotoTitle'),
      t('common.chooseOption'),
      [
        { text: t('common.takePhoto'), onPress: () => takePhoto(index) },
        { text: t('common.chooseFromLibrary'), onPress: () => pickPhoto(index) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Remove photo at index (also cancels an in-flight / stuck upload)
  const removePhoto = (index) => {
    beginPhotoUpload(index); // invalidate any in-flight upload for this slot
    setUploadingPhotoIndex((current) => (current === index ? null : current));
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      const filtered = next.filter((p) => p !== null);
      syncPhotoUrls(filtered);
      return filtered;
    });
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
    const requireText = (value, message) => {
      if (!value || (typeof value === 'string' && !String(value).trim())) {
        Alert.alert(t('common.error'), message);
        return false;
      }
      return true;
    };
    const requireAnswered = (value, message) => {
      if (value === null || value === undefined || value === '') {
        Alert.alert(t('common.error'), message);
        return false;
      }
      return true;
    };
    const v = (key, vars) => t(`application.validation.${key}`, vars || {});

    switch (step) {
      case 1: {
        const resolvedFullName = resolveFullName(applicationData);
        if (!resolvedFullName) {
          Alert.alert(t('common.error'), t('application.errorEnterFullName'));
          return false;
        }
        if (resolvedFullName !== String(applicationData.fullName || '').trim()) {
          setApplicationData((prev) => ({ ...prev, fullName: resolvedFullName }));
        }
        if (!applicationData.age || parseInt(applicationData.age) < 21 || parseInt(applicationData.age) > 40) {
          Alert.alert(t('common.error'), t('application.errorAgeRange'));
          return false;
        }
        if (!applicationData.dateOfBirth.trim()) {
          Alert.alert(t('common.error'), t('application.errorEnterDateOfBirth'));
          return false;
        }
        const calculatedAge = calculateAgeFromDateOfBirth(applicationData.dateOfBirth);
        if (calculatedAge === null) {
          Alert.alert(t('common.error'), t('application.errorInvalidDateOfBirth'));
          return false;
        }
        const enteredAge = parseInt(applicationData.age);
        if (Math.abs(calculatedAge - enteredAge) > 1) {
          Alert.alert(t('common.error'), t('application.errorAgeMismatch', { calculatedAge, enteredAge }));
          return false;
        }
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
        if (!requireAnswered(applicationData.previousSurrogacy, v('previousSurrogacy'))) return false;
        if (applicationData.previousSurrogacy === true && !requireText(applicationData.previousSurrogacyCount, v('previousSurrogacyCount'))) return false;
        if (!requireText(applicationData.bloodType, v('bloodType'))) return false;
        const heightVal = composeHeightDisplay(applicationData) || applicationData.height;
        if (!requireText(heightVal, v('height'))) return false;
        const weightVal = composeWeightDisplay(applicationData) || applicationData.weight;
        if (!requireText(weightVal, v('weight'))) return false;
        if (!requireAnswered(applicationData.significantWeightChange, v('significantWeightChange'))) return false;
        if (!requireText(applicationData.race, v('race'))) return false;
        if (!requireText(applicationData.religiousBackground, v('religiousBackground'))) return false;
        if (!requireAnswered(applicationData.practicingReligion, v('practicingReligion'))) return false;
        if (!requireAnswered(applicationData.usCitizen, v('usCitizen'))) return false;
        if (applicationData.usCitizen === false && !requireText(applicationData.citizenshipStatus, v('citizenshipStatus'))) return false;
        if (!requireAnswered(applicationData.isSingle, v('isSingle'))) return false;
        if (applicationData.isSingle === false) {
          if (!requireAnswered(applicationData.isMarried, v('isMarried'))) return false;
          if (applicationData.isMarried === true) {
            if (!requireText(applicationData.marriageDate, v('marriageDate'))) return false;
            if (!requireText(applicationData.spouseName, v('spouseName'))) return false;
            if (!requireText(applicationData.spouseDateOfBirth, v('spouseDateOfBirth'))) return false;
            if (!requireText(applicationData.maritalProblems, v('maritalProblems'))) return false;
            if (!requireAnswered(applicationData.legallySeparated, v('legallySeparated'))) return false;
            if (applicationData.legallySeparated === true && !requireText(applicationData.separationDetails, v('separationDetails'))) return false;
          }
          if (!requireAnswered(applicationData.divorced, v('divorced'))) return false;
          if (applicationData.divorced === true) {
            if (!requireText(applicationData.divorceDate, v('divorceDate'))) return false;
            if (!requireText(applicationData.divorceCause, v('divorceCause'))) return false;
            if (!requireAnswered(applicationData.remarried, v('remarried'))) return false;
            if (applicationData.remarried === true && !requireText(applicationData.remarriedDate, v('remarriedDate'))) return false;
          }
          if (!requireAnswered(applicationData.isWidowed, v('isWidowed'))) return false;
          if (applicationData.isWidowed === true && !requireText(applicationData.widowedDate, v('widowedDate'))) return false;
          if (!requireAnswered(applicationData.lifePartner, v('lifePartner'))) return false;
          if (applicationData.lifePartner === true && !requireText(applicationData.partnerName, v('partnerName'))) return false;
          if (applicationData.lifePartner === true && !requireText(applicationData.partnerDateOfBirth, v('partnerDateOfBirth'))) return false;
          if (!requireAnswered(applicationData.engaged, v('engaged'))) return false;
          if (applicationData.engaged === true) {
            if (!requireText(applicationData.engagementDate, v('engagementDate'))) return false;
            if (!requireText(applicationData.weddingDate, v('weddingDate'))) return false;
          }
        }
        if (!requireAnswered(applicationData.wantMoreChildren, v('wantMoreChildren'))) return false;
        if (!requireText(applicationData.legalProblems, v('legalProblems'))) return false;
        if (!requireText(applicationData.jailTime, v('jailTime'))) return false;
        if (!requireText(applicationData.nearestAirport, v('nearestAirport'))) return false;
        if (!requireText(applicationData.airportDistance, v('airportDistance'))) return false;
        if (!requireText(applicationData.pets, v('pets'))) return false;
        if (!requireText(applicationData.livingSituation, v('livingSituation'))) return false;
        if (!requireAnswered(applicationData.ownCar, v('ownCar'))) return false;
        if (!requireAnswered(applicationData.driverLicense, v('driverLicense'))) return false;
        if (applicationData.ownCar === true && !requireAnswered(applicationData.carInsured, v('carInsured'))) return false;
        // Match UI: transportation prompt only shown when driverLicense === false
        if (applicationData.driverLicense === false && !requireText(applicationData.transportationMethod, v('transportationMethod'))) return false;
        if (!requireText(applicationData.siblingsCount, v('siblingsCount'))) return false;
        if (!requireText(applicationData.motherSiblingsCount, v('motherSiblingsCount'))) return false;
        return true;
      }

      case 2: {
        if (!applicationData.totalDeliveries || (typeof applicationData.totalDeliveries === 'string' && !applicationData.totalDeliveries.trim())) {
          Alert.alert(t('common.error'), v('totalDeliveries'));
          return false;
        }
        const deliveryCount = Math.min(parseInt(applicationData.totalDeliveries, 10) || 0, 5);
        const deliveries = Array.isArray(applicationData.deliveries) ? applicationData.deliveries : [];
        for (let i = 0; i < deliveryCount; i += 1) {
          const d = deliveries[i] || {};
          const n = i + 1;
          if (!requireText(d.year, v('deliveryYear', { n }))) return false;
          if (!requireText(d.conceptionMethod, v('deliveryConception', { n }))) return false;
          if (!requireText(d.deliveryMonth, v('deliveryMonth', { n }))) return false;
          if (!requireText(d.deliveryDay, v('deliveryDay', { n }))) return false;
          if (!requireText(d.deliveryYear, v('deliveryYearFull', { n }))) return false;
          if (!requireText(d.gestationWeeks, v('deliveryGestation', { n }))) return false;
          if (!requireText(d.fetusesCount, v('deliveryFetuses', { n }))) return false;
          const fetusCount = Math.max(parseInt(d.fetusesCount, 10) || 0, 0);
          if (fetusCount < 1) {
            Alert.alert(t('common.error'), v('deliveryFetuses', { n }));
            return false;
          }
          const babies = Array.isArray(d.babies) ? d.babies : [];
          for (let b = 0; b < fetusCount; b += 1) {
            const baby = babies[b] || {};
            const babyNum = b + 1;
            if (!requireText(baby.gender, v('deliveryBabyGender', { n, b: babyNum }))) return false;
            if (!requireText(baby.birthWeight, v('deliveryBabyBirthWeight', { n, b: babyNum }))) return false;
          }
          if (!requireText(d.pregnancyResult, v('deliveryPregnancyResult', { n }))) return false;
          if (!requireText(d.deliveryMethod, v('deliveryMethod', { n }))) return false;
        }
        return true;
      }

      case 3: {
        if (!requireAnswered(applicationData.healthInsurance, v('healthInsurance'))) return false;
        if (applicationData.healthInsurance === true) {
          if (applicationData.maternityCoverage !== true && applicationData.maternityCoverage !== 'not_sure') {
            Alert.alert(t('common.error'), v('maternityCoverage'));
            return false;
          }
        }
        if (!requireText(applicationData.deliveryHospital, v('deliveryHospital'))) return false;
        if (!requireAnswered(applicationData.deliveredAtHospitalBefore, v('deliveredAtHospitalBefore'))) return false;
        if (!requireAnswered(applicationData.abnormalPapSmear, v('abnormalPapSmear'))) return false;
        if (!requireAnswered(applicationData.monthlyCycles, v('monthlyCycles'))) return false;
        if (!requireAnswered(applicationData.infertilityDoctor, v('infertilityDoctor'))) return false;
        if (applicationData.infertilityDoctor === true && !requireText(applicationData.infertilityDetails, v('infertilityDetails'))) return false;
        if (!requireText(applicationData.smokingStatus, t('application.errorSmokingStatus'))) return false;
        if (!requireAnswered(applicationData.householdSmoking, v('householdSmoking'))) return false;
        if (!requireAnswered(applicationData.householdMarijuana, v('householdMarijuana'))) return false;
        if (!requireText(applicationData.alcoholUsage, v('alcoholUsage'))) return false;
        if (!requireAnswered(applicationData.illegalDrugs, v('illegalDrugs'))) return false;
        if (!requireAnswered(applicationData.partnerIllegalDrugs, v('partnerIllegalDrugs'))) return false;
        if (!requireText(applicationData.childrenList, v('childrenList'))) return false;
        if (!requireAnswered(applicationData.pregnancyProblems, v('pregnancyProblems'))) return false;
        if (applicationData.pregnancyProblems === true && !requireText(applicationData.pregnancyProblemsDetails, v('pregnancyProblemsDetails'))) return false;
        if (!requireAnswered(applicationData.childrenHealthProblems, v('childrenHealthProblems'))) return false;
        if (applicationData.childrenHealthProblems === true && !requireText(applicationData.childrenHealthDetails, v('childrenHealthDetails'))) return false;
        if (!requireAnswered(applicationData.breastfeeding, v('breastfeeding'))) return false;
        if (!requireAnswered(applicationData.surgeries, v('surgeries'))) return false;
        if (!requireAnswered(applicationData.tattoosPiercings, v('tattoosPiercings'))) return false;
        if (applicationData.tattoosPiercings === true && !requireText(applicationData.tattoosPiercingsDate, v('tattoosPiercingsDate'))) return false;
        if (!requireAnswered(applicationData.mentalHealthTreatment, v('mentalHealthTreatment'))) return false;
        if (!requireAnswered(applicationData.postpartumDepression, v('postpartumDepression'))) return false;
        if (!requireAnswered(applicationData.depressionMedication, v('depressionMedication'))) return false;
        if (applicationData.depressionMedication === true && !requireText(applicationData.depressionMedicationDetails, v('depressionMedicationDetails'))) return false;
        if (!requireAnswered(applicationData.drugAlcoholAbuse, v('drugAlcoholAbuse'))) return false;
        if (!requireAnswered(applicationData.excessHeat, v('excessHeat'))) return false;
        if (!requireAnswered(applicationData.alcoholLimitAdvised, v('alcoholLimitAdvised'))) return false;
        if (!requireAnswered(applicationData.hepatitisBVaccinated, v('hepatitisBVaccinated'))) return false;
        if (!requireAnswered(applicationData.allergies, v('allergies'))) return false;
        return true;
      }

      case 4: {
        if (!requireText(applicationData.pastContraceptives, v('pastContraceptives'))) return false;
        if (!requireAnswered(applicationData.currentBirthControl, v('currentBirthControl'))) return false;
        if (!requireAnswered(applicationData.sexualPartner, v('sexualPartner'))) return false;
        if (!requireAnswered(applicationData.multiplePartners, v('multiplePartners'))) return false;
        if (!requireText(applicationData.partnersLastThreeYears, v('partnersLastThreeYears'))) return false;
        if (!requireAnswered(applicationData.highRiskHIVContact, v('highRiskHIVContact'))) return false;
        if (!requireAnswered(applicationData.hivRisk, v('hivRisk'))) return false;
        if (!requireAnswered(applicationData.bloodTransfusion, v('bloodTransfusion'))) return false;
        if (!requireAnswered(applicationData.stdHistory, v('stdHistory'))) return false;
        return true;
      }

      case 5: {
        if (!requireText(applicationData.currentEmployment, v('currentEmployment'))) return false;
        if (!requireText(applicationData.monthlyIncome, v('monthlyIncome'))) return false;
        if (applicationData.isMarried === true || applicationData.maritalStatus === 'married') {
          if (!requireText(applicationData.spouseEmployment, v('spouseEmployment'))) return false;
          if (!requireText(applicationData.spouseMonthlyIncome, v('spouseMonthlyIncome'))) return false;
        }
        if (!requireText(applicationData.personsSupported, v('personsSupported'))) return false;
        if (!requireAnswered(applicationData.publicAssistance, v('publicAssistance'))) return false;
        if (!requireText(applicationData.householdMembers, v('householdMembers'))) return false;
        return true;
      }

      case 6: {
        if (!requireText(applicationData.educationLevel, v('educationLevel'))) return false;
        return true;
      }

      case 7: {
        if (!requireText(applicationData.surrogacyUnderstanding, v('surrogacyUnderstanding'))) return false;
        if (!requireText(applicationData.selfIntroduction, v('selfIntroduction'))) return false;
        if (!Array.isArray(applicationData.mainConcerns) || applicationData.mainConcerns.length < 1) {
          Alert.alert(t('common.error'), v('mainConcerns'));
          return false;
        }
        if (!requireText(applicationData.parentQualities, v('parentQualities'))) return false;
        const yesNoFields = [
          'religiousPreference','unmarriedCouple','heterosexualCouple','eggDonor','spermDonor','olderCouple','coupleWithChildren','sameSexCouple','singleMale','singleFemale','internationalCouple','nonEnglishSpeaking','carryTwins','reductionWilling','amniocentesis','abortionWilling','concernsPlacingBaby','parentsInDeliveryRoom','parentsAtAppointments','notifyHospital','parentsOnBirthCertificate','applyingElsewhere','rejectedElsewhere','attendCheckups','receiveInjections','medicalExaminations','avoidLongTravel','followGuidelines','avoidHighRiskWork','placedChildAdoption','unsupportivePeople','childcareSupport',
        ];
        for (const key of yesNoFields) {
          const label = t(`application.preferenceLabels.${key}`);
          if (!requireAnswered(applicationData[key], v('pleaseAnswer', { label }))) return false;
        }
        if (!requireText(applicationData.contactDuringProcess, v('contactDuringProcess'))) return false;
        if (!requireText(applicationData.contactAfterBirth, v('contactAfterBirth'))) return false;
        if (!requireText(applicationData.expectedSupport, v('expectedSupport'))) return false;
        if (!requireText(applicationData.partnerFeelings, v('partnerFeelings'))) return false;
        return true;
      }

      case 8: {
        if (!applicationData.authorizationAgreed) {
          Alert.alert(t('common.error'), v('authorizationAgreed'));
          return false;
        }
        if (!requireText(applicationData.email, v('applicantEmail'))) return false;
        if (!validateEmail(String(applicationData.email).trim())) {
          Alert.alert(t('common.error'), t('application.errorInvalidEmail'));
          return false;
        }
        if (!requireText(applicationData.phoneNumber, v('applicantPhone'))) return false;
        if (!requireText(applicationData.address, v('applicantAddress'))) return false;
        if (!requireText(applicationData.emergencyContact, v('emergencyContact'))) return false;
        const urls = new Set([
          ...photos.filter((p) => p && p.url).map((p) => p.url),
          ...((Array.isArray(applicationData.photos) ? applicationData.photos : []).filter(Boolean)),
        ]);
        const uploadedCount = urls.size;
        if (uploadedCount < 1) {
          Alert.alert(t('common.error'), v('uploadAtLeastOnePhoto'));
          return false;
        }
        if (photos.some((p) => p && p.uploading) || uploadingPhotoIndex !== null) {
          Alert.alert(t('common.error'), v('waitPhotoUploads'));
          return false;
        }
        return true;
      }

      default:
        return true;
    }
  };

  const handleNext = async () => {
    // Lazy registration: require auth after Step 1 if not logged in
    if (currentStep === 1 && !user) {
      if (!validateStep(1)) return;
      // Persist full step-1 snapshot before auth remount can wipe in-memory state
      const envelope = buildDraftEnvelope({
        currentStep: 1,
        data: applicationDataRef.current || applicationData,
        photos: photosRef.current || photos,
      });
      await persistDraftForAuthHandoff({
        envelope,
        guestKey: getSurrogateDraftKey(null),
        pendingKey: PENDING_SURROGATE_DRAFT_KEY,
      });
      const emailFromForm = String(applicationData.email || '').trim();
      if (emailFromForm) {
        setAuthEmail(emailFromForm);
      }
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
    // Snapshot form to guest+pending BEFORE signUp — auth remounts the whole navigator
    const snapshotData = applicationDataRef.current || applicationData;
    const snapshotPhotos = photosRef.current || photos;
    const handoffEnvelope = buildDraftEnvelope({
      currentStep: currentStepRef.current || 1,
      data: snapshotData,
      photos: snapshotPhotos,
    });
    await persistDraftForAuthHandoff({
      envelope: handoffEnvelope,
      guestKey: getSurrogateDraftKey(null),
      pendingKey: PENDING_SURROGATE_DRAFT_KEY,
    });

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
            name: resolveFullName(snapshotData),
            phone: snapshotData.phoneNumber,
            address: sanitizeAddressText(snapshotData.address) || '',
            age: snapshotData.age || '',
            date_of_birth: snapshotData.dateOfBirth || '',
            hear_about_us: snapshotData.hearAboutUs || '',
            race: snapshotData.race || '',
            referred_by: snapshotData.referralCode?.trim() || null,
          },
        },
      });

      const isAlreadyRegistered =
        (authError?.message &&
          (authError.message.includes('already registered') ||
            authError.message.includes('User already registered'))) ||
        (authData?.user?.identities && authData.user.identities.length === 0);

      if (isAlreadyRegistered) {
        Alert.alert(
          t('application.emailAlreadyRegisteredTitle'),
          t('application.emailAlreadyRegisteredMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('application.goToLogin'),
              onPress: () => {
                setShowAuthPrompt(false);
                navigation.navigate('LoginScreen');
              },
            },
          ]
        );
        return;
      }

      if (authError) throw authError;

      const userId = authData?.user?.id;
      if (userId) {
        // Upsert profile
        let inviteCode = generateInviteCode();
        let attempts = 0;
        while (attempts < 3) {
          // Extract location from address if not already set
          const extractedLocation = extractLocationFromAddress(snapshotData.address);
          const ipInfo = await getClientIpInfo();
          
          const profilePayload = {
            id: userId,
            role,
            name: resolveFullName(snapshotData),
            phone: snapshotData.phoneNumber,
            date_of_birth: snapshotData.dateOfBirth || null,
            email: authEmail.trim(),
            address: sanitizeAddressText(snapshotData.address) || '',
            location: extractedLocation || '', // Auto-extract city from address
            invite_code: inviteCode,
            race: snapshotData.race || '',
            referred_by: snapshotData.referralCode?.trim() || null,
          };
          if (ipInfo.ip) profilePayload.signup_ip = ipInfo.ip;
          if (ipInfo.region) profilePayload.signup_ip_region = ipInfo.region;
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

        await persistDraftForAuthHandoff({
          envelope: handoffEnvelope,
          guestKey: getSurrogateDraftKey(null),
          pendingKey: PENDING_SURROGATE_DRAFT_KEY,
          userKey: getSurrogateDraftKey(userId),
        });

        // If this instance is still mounted, re-apply; remount path uses loadDraft fallbacks
        await loadDraft(userId);
        setFormVersion(Date.now());
      }

      // Store email into form for continuity
      updateField('email', authEmail.trim());
      setShowAuthPrompt(false);
      // pass draft via route params to survive navigator remounts
      navigation.setParams({ draft: snapshotData, draftVersion: Date.now() });
      Alert.alert(t('application.progressSaved'), t('application.accountCreatedProgressSaved'));
    } catch (error) {
      console.error('Lazy signup error:', error);
      const alreadyRegistered =
        error?.message &&
        (error.message.includes('already registered') ||
          error.message.includes('User already registered'));
      if (alreadyRegistered) {
        Alert.alert(
          t('application.emailAlreadyRegisteredTitle'),
          t('application.emailAlreadyRegisteredMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('application.goToLogin'),
              onPress: () => {
                setShowAuthPrompt(false);
                navigation.navigate('LoginScreen');
              },
            },
          ]
        );
        return;
      }
      Alert.alert(t('application.errorSavingProgress'), error.message || t('application.errorSavingProgressMessage'));
      await AsyncStorageLib.removeItem('resume_application_flow');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async () => {
    for (let step = 1; step <= 8; step += 1) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

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
      const ipInfo = await getClientIpInfo();
      
      const profileUpdate = {
        id: authUser.id,
        name: resolveFullName(applicationData),
        phone: applicationData.phoneNumber,
        date_of_birth: applicationData.dateOfBirth || null,
        email: applicationData.email || authUser.email,
        address: sanitizeAddressText(applicationData.address) || '',
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
      const { fullName: _ignoredFullName, phoneNumber, ...otherFields } = applicationData;
      const resolvedName = resolveFullName(applicationData);
      const heightDisplay = composeHeightDisplay(applicationData) || applicationData.height || '';
      const weightDisplay = composeWeightDisplay(applicationData) || applicationData.weight || '';
      
      const payload = {
        full_name: resolvedName,
        phone: phoneNumber,
        form_data: JSON.stringify({
          ...otherFields,
          fullName: resolvedName,
          address: sanitizeAddressText(otherFields.address || applicationData.address) || '',
          height: heightDisplay,
          weight: weightDisplay,
          applicantIp: ipInfo.ip || undefined,
          applicantIpRegion: ipInfo.region || undefined,
        }),
        user_id: authUser.id,  // 添加用户ID
        status: 'pending',
      };
      if (ipInfo.ip) payload.ip_address = ipInfo.ip;
      if (ipInfo.region) payload.ip_region = ipInfo.region;

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
            status: 'pending',
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

      // Application submitted/updated successfully; clear resume flag + mid-form draft
      await AsyncStorageLib.removeItem('resume_application_flow');
      await clearApplicationDraft(getDraftKey());
      await clearApplicationDraft(getSurrogateDraftKey(null));
      await clearApplicationDraft(PENDING_SURROGATE_DRAFT_KEY);
      skipExitPromptRef.current = true;

      // Create local application object for history
      const application = {
        id: resultData && resultData[0] ? resultData[0].id : `APP-${Date.now()}`,
        type: 'Surrogacy Application',
        status: 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        description: `Surrogacy Application - ${resolveFullName(applicationData)}`,
        nextStep: 'Wait for initial review and medical screening',
        documents: ['Application Form', 'Medical History', 'Background Check'],
        notes: editMode
          ? tf("Application updated and returned to pending review.") : tf("Application submitted successfully. Our team will review and contact you within 5-7 business days."),
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
      <Text style={styles.stepTitle}>{tf("Personal Information")}</Text>
      <Text style={styles.stepDescription}>{tf("Please answer all questions. If something does not apply to you, please write N/A")}</Text>
      
      {/* Full Legal Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What is your full legal name? *")}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
        <TextInput
          style={styles.input}
              value={applicationData.firstName}
              onChangeText={(value) => updateField('firstName', value)}
              placeholder={tf("First Name")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={applicationData.middleName}
              onChangeText={(value) => updateField('middleName', value)}
              placeholder={tf("Middle Name")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={applicationData.lastName}
              onChangeText={(value) => updateField('lastName', value)}
              placeholder={tf("Last Name")}
            />
          </View>
        </View>
        {/* Also keep fullName for backward compatibility */}
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={resolveFullName(applicationData)}
          onChangeText={(value) => updateField('fullName', value)}
          placeholder={tf("Full Name (or auto-filled from above)")}
        />
      </View>

      {/* Date of Birth */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What is your date of birth? *")}</Text>
        <DatePickerField
          value={
            applicationData.dateOfBirth ||
            (applicationData.dateOfBirthMonth &&
            applicationData.dateOfBirthDay &&
            applicationData.dateOfBirthYear
              ? `${String(applicationData.dateOfBirthMonth).padStart(2, '0')}/${String(applicationData.dateOfBirthDay).padStart(2, '0')}/${applicationData.dateOfBirthYear}`
              : '')
          }
          onChange={(next) => updateField('dateOfBirth', next)}
          format="MM/DD/YYYY"
          placeholder={tf("MM/DD/YYYY")}
          style={styles.input}
          variant="dob"
        />
      </View>

      {/* Age (calculated or entered) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Age *")}</Text>
        <TextInput
          key={`age-${formVersion}`}
          style={styles.input}
          value={applicationData.age || ''}
          onChangeText={(value) => updateField('age', value)}
          placeholder={tf("Age (21-40)")}
          keyboardType="numeric"
        />
      </View>

      {/* Contact — required by step 1 validation; was previously only on step 8 (read-only) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Phone Number *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.phoneNumber || ''}
          onChangeText={(value) => updateField('phoneNumber', value)}
          placeholder={tf("Phone number")}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Email *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.email || ''}
          onChangeText={(value) => updateField('email', value)}
          placeholder={tf("Email address")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* How did you hear about us */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How did you hear about us? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.hearAboutUs || ''}
          onChangeText={(value) => updateField('hearAboutUs', value)}
          placeholder={tf("How did you hear about us?")}
        />
      </View>

      {/* Previous Surrogacy */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you been a surrogate before? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.previousSurrogacy === true && styles.radioButtonSelected]}
            onPress={() => updateField('previousSurrogacy', true)}
          >
            <Text style={[styles.radioText, applicationData.previousSurrogacy === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.previousSurrogacy === false && styles.radioButtonSelected]}
            onPress={() => updateField('previousSurrogacy', false)}
          >
            <Text style={[styles.radioText, applicationData.previousSurrogacy === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.previousSurrogacy && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("How many times have you been a surrogate before? *")}</Text>
        <TextInput
          style={styles.input}
            value={applicationData.previousSurrogacyCount || ''}
            onChangeText={(value) => updateField('previousSurrogacyCount', value)}
            placeholder={tf("Number of times")}
            keyboardType="numeric"
        />
      </View>
      )}

      {/* Blood Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What is your blood type? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.bloodType || ''}
          onChangeText={(value) => updateField('bloodType', value)}
          placeholder={tf("e.g., A+, B-, O+, AB+")}
        />
      </View>

      {/* Height */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What is your height? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, (applicationData.heightUnit || 'ft_in') === 'ft_in' && styles.radioButtonSelected]}
            onPress={() => updateField('heightUnit', 'ft_in')}
          >
            <Text style={[styles.radioText, (applicationData.heightUnit || 'ft_in') === 'ft_in' && styles.radioTextSelected]}>
              ft / in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.heightUnit === 'cm' && styles.radioButtonSelected]}
            onPress={() => updateField('heightUnit', 'cm')}
          >
            <Text style={[styles.radioText, applicationData.heightUnit === 'cm' && styles.radioTextSelected]}>
              cm
            </Text>
          </TouchableOpacity>
        </View>
        {(applicationData.heightUnit || 'ft_in') === 'ft_in' ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={applicationData.heightFeet || ''}
                onChangeText={(value) => updateField('heightFeet', value.replace(/[^0-9]/g, ''))}
                placeholder={tf("Feet")}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={applicationData.heightInches || ''}
                onChangeText={(value) => updateField('heightInches', value.replace(/[^0-9.]/g, ''))}
                placeholder={tf("Inches")}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ) : (
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={applicationData.heightCm || ''}
            onChangeText={(value) => updateField('heightCm', value.replace(/[^0-9.]/g, ''))}
            placeholder={tf("Height in cm")}
            keyboardType="decimal-pad"
          />
        )}
      </View>

      {/* Weight */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What is your weight? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, (applicationData.weightUnit || 'lbs') === 'lbs' && styles.radioButtonSelected]}
            onPress={() => updateField('weightUnit', 'lbs')}
          >
            <Text style={[styles.radioText, (applicationData.weightUnit || 'lbs') === 'lbs' && styles.radioTextSelected]}>
              {tf("lbs")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.weightUnit === 'kg' && styles.radioButtonSelected]}
            onPress={() => updateField('weightUnit', 'kg')}
          >
            <Text style={[styles.radioText, applicationData.weightUnit === 'kg' && styles.radioTextSelected]}>
              {tf("kg")}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={applicationData.weightValue || ''}
          onChangeText={(value) => updateField('weightValue', value.replace(/[^0-9.]/g, ''))}
          placeholder={(applicationData.weightUnit || 'lbs') === 'kg' ? tf("Weight in kg") : tf("Weight in lbs")}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Significant Weight Change */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you gained/lost a significant amount of weight in the last year? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.significantWeightChange === true && styles.radioButtonSelected]}
            onPress={() => updateField('significantWeightChange', true)}
          >
            <Text style={[styles.radioText, applicationData.significantWeightChange === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.significantWeightChange === false && styles.radioButtonSelected]}
            onPress={() => updateField('significantWeightChange', false)}
          >
            <Text style={[styles.radioText, applicationData.significantWeightChange === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Race/Ethnic Background */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What is your race/ethnic background? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.race || ''}
          onChangeText={(value) => updateField('race', value)}
          placeholder={tf("Race/Ethnic background")}
        />
      </View>

      {/* Religious Background */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What is your religious background? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.religiousBackground || ''}
          onChangeText={(value) => updateField('religiousBackground', value)}
          placeholder={tf("Religious background")}
        />
      </View>

      {/* Practicing Religion */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you currently practicing in your religion? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.practicingReligion === true && styles.radioButtonSelected]}
            onPress={() => updateField('practicingReligion', true)}
          >
            <Text style={[styles.radioText, applicationData.practicingReligion === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.practicingReligion === false && styles.radioButtonSelected]}
            onPress={() => updateField('practicingReligion', false)}
          >
            <Text style={[styles.radioText, applicationData.practicingReligion === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* US Citizen */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you a US Citizen? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.usCitizen === true && styles.radioButtonSelected]}
            onPress={() => updateField('usCitizen', true)}
          >
            <Text style={[styles.radioText, applicationData.usCitizen === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.usCitizen === false && styles.radioButtonSelected]}
            onPress={() => updateField('usCitizen', false)}
          >
            <Text style={[styles.radioText, applicationData.usCitizen === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!applicationData.usCitizen && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("If you are not a US Citizen, please specify your citizenship and current legal status in United States *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
            value={applicationData.citizenshipStatus || ''}
            onChangeText={(value) => updateField('citizenshipStatus', value)}
            placeholder={tf("Citizenship and legal status")}
          multiline
          numberOfLines={3}
        />
      </View>
      )}

      {/* Marital Status Section */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you single? *")}</Text>
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
            <Text style={[styles.radioText, applicationData.isSingle === true && styles.radioTextSelected]}>{tf("YES")}</Text>
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
            <Text style={[styles.radioText, applicationData.isSingle === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.isSingle === false && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Are you married? *")}</Text>
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
                <Text style={[styles.radioText, applicationData.isMarried === true && styles.radioTextSelected]}>{tf("YES")}</Text>
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
                <Text style={[styles.radioText, applicationData.isMarried === false && styles.radioTextSelected]}>{tf("NO")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Married - Spouse Information */}
          {applicationData.maritalStatus === 'married' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("What was the date of your marriage? *")}</Text>
                <DatePickerField
                  value={applicationData.marriageDate || ''}
                  onChange={(next) => updateField('marriageDate', next)}
                  format="MM/DD/YYYY"
                  placeholder={tf("MM/DD/YYYY")}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("What is your spouse's name? *")}</Text>
                <TextInput
                  style={styles.input}
                  value={applicationData.spouseName || ''}
                  onChangeText={(value) => updateField('spouseName', value)}
                  placeholder={tf("Spouse's full name")}
                />
    </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("What is your spouse's date of birth? *")}</Text>
                <DatePickerField
                  value={applicationData.spouseDateOfBirth || ''}
                  onChange={(next) => updateField('spouseDateOfBirth', next)}
                  format="MM/DD/YYYY"
                  placeholder={tf("MM/DD/YYYY")}
                  style={styles.input}
                  variant="dob"
                />
              </View>
      
      <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("Have you ever experienced marital problems? If yes, please explain. *")}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={applicationData.maritalProblems || ''}
                  onChangeText={(value) => updateField('maritalProblems', value)}
                  placeholder={tf("If yes, please explain")}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("Are you legally separated? *")}</Text>
                <View style={styles.radioContainer}>
                  <TouchableOpacity
                    style={[styles.radioButton, applicationData.legallySeparated === true && styles.radioButtonSelected]}
                    onPress={() => updateField('legallySeparated', true)}
                  >
                    <Text style={[styles.radioText, applicationData.legallySeparated === true && styles.radioTextSelected]}>{tf("YES")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, applicationData.legallySeparated === false && styles.radioButtonSelected]}
                    onPress={() => {
                      updateField('legallySeparated', false);
                      updateField('separationDetails', '');
                    }}
                  >
                    <Text style={[styles.radioText, applicationData.legallySeparated === false && styles.radioTextSelected]}>{tf("NO")}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {applicationData.legallySeparated && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{tf("If you are separated, how long have you been married and how long have you been separated? *")}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={applicationData.separationDetails || ''}
                    onChangeText={(value) => updateField('separationDetails', value)}
                    placeholder={tf("Marriage duration and separation duration")}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </>
          )}

          {/* Divorce - Independent of married status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Have you ever been divorced? *")}</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.divorced === true && styles.radioButtonSelected]}
                onPress={() => updateField('divorced', true)}
              >
                <Text style={[styles.radioText, applicationData.divorced === true && styles.radioTextSelected]}>{tf("YES")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.divorced === false && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('divorced', false);
                  updateField('divorceDate', '');
                  updateField('divorceCause', '');
                }}
              >
                <Text style={[styles.radioText, applicationData.divorced === false && styles.radioTextSelected]}>{tf("NO")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.divorced && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("When did your divorce occur? *")}</Text>
                <DatePickerField
                  value={applicationData.divorceDate || ''}
                  onChange={(next) => updateField('divorceDate', next)}
                  format="MM/DD/YYYY"
                  placeholder={tf("MM/DD/YYYY")}
                  style={styles.input}
                />
              </View>

      <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("What was the cause of your break up? *")}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={applicationData.divorceCause || ''}
                  onChangeText={(value) => updateField('divorceCause', value)}
                  placeholder={tf("Reason for divorce")}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("Have you re-married? If yes, how long ago? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
                    style={[styles.radioButton, applicationData.remarried === true && styles.radioButtonSelected]}
                    onPress={() => updateField('remarried', true)}
          >
                    <Text style={[styles.radioText, applicationData.remarried === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
                    style={[styles.radioButton, applicationData.remarried === false && styles.radioButtonSelected]}
                    onPress={() => {
                      updateField('remarried', false);
                      updateField('remarriedDate', '');
                    }}
                  >
                    <Text style={[styles.radioText, applicationData.remarried === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

              {applicationData.remarried && (
      <View style={styles.inputGroup}>
                  <Text style={styles.label}>{tf("When did you re-marry? *")}</Text>
                  <DatePickerField
                    value={applicationData.remarriedDate || ''}
                    onChange={(next) => updateField('remarriedDate', next)}
                    format="MM/DD/YYYY"
                    placeholder={tf("MM/DD/YYYY")}
                    style={styles.input}
                  />
                </View>
              )}
            </>
          )}

          {/* Widowed */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Are you widowed? If so, when was your partner deceased? *")}</Text>
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
                <Text style={[styles.radioText, applicationData.isWidowed === true && styles.radioTextSelected]}>{tf("YES")}</Text>
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
                <Text style={[styles.radioText, applicationData.isWidowed === false && styles.radioTextSelected]}>{tf("NO")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.isWidowed === true && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{tf("When was your partner deceased? *")}</Text>
              <DatePickerField
                value={applicationData.widowedDate || ''}
                onChange={(next) => updateField('widowedDate', next)}
                format="MM/DD/YYYY"
                placeholder={tf("MM/DD/YYYY")}
                style={styles.input}
              />
            </View>
          )}

          {/* Life Partner */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Do you have a Life Partner? If so, how long have you been together? *")}</Text>
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
                <Text style={[styles.radioText, applicationData.lifePartner === true && styles.radioTextSelected]}>{tf("YES")}</Text>
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
                <Text style={[styles.radioText, applicationData.lifePartner === false && styles.radioTextSelected]}>{tf("NO")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.lifePartner && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("What is your partner's full name and date of birth? *")}</Text>
                <TextInput
                  style={styles.input}
                  value={applicationData.partnerName || ''}
                  onChangeText={(value) => updateField('partnerName', value)}
                  placeholder={tf("Partner's full name")}
                />
                <DatePickerField
                  value={applicationData.partnerDateOfBirth || ''}
                  onChange={(next) => updateField('partnerDateOfBirth', next)}
                  format="MM/DD/YYYY"
                  placeholder={tf("Partner's date of birth (MM/DD/YYYY)")}
                  style={[styles.input, { marginTop: 10 }]}
                  variant="dob"
                />
              </View>
            </>
          )}

          {/* Engaged */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Are you engaged? If so, when was your engagement and when are you scheduled to be married? *")}</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.engaged === true && styles.radioButtonSelected]}
                onPress={() => {
                  updateField('engaged', true);
                  updateField('maritalStatus', 'engaged');
                  updateField('lifePartner', false);
                }}
              >
                <Text style={[styles.radioText, applicationData.engaged === true && styles.radioTextSelected]}>{tf("YES")}</Text>
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
                <Text style={[styles.radioText, applicationData.engaged === false && styles.radioTextSelected]}>{tf("NO")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.engaged && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("When was your engagement? *")}</Text>
                <DatePickerField
                  value={applicationData.engagementDate || ''}
                  onChange={(next) => updateField('engagementDate', next)}
                  format="MM/DD/YYYY"
                  placeholder={tf("MM/DD/YYYY")}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("When are you scheduled to be married? *")}</Text>
                <DatePickerField
                  value={applicationData.weddingDate || ''}
                  onChange={(next) => updateField('weddingDate', next)}
                  format="MM/DD/YYYY"
                  placeholder={tf("MM/DD/YYYY")}
                  style={styles.input}
                />
              </View>
            </>
          )}
        </>
      )}

      {/* Want More Children */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you like to have any more children of your own in the future? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.wantMoreChildren === true && styles.radioButtonSelected]}
            onPress={() => updateField('wantMoreChildren', true)}
          >
            <Text style={[styles.radioText, applicationData.wantMoreChildren === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.wantMoreChildren === false && styles.radioButtonSelected]}
            onPress={() => updateField('wantMoreChildren', false)}
          >
            <Text style={[styles.radioText, applicationData.wantMoreChildren === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal Problems */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Please list any problems you or your spouse/partner have experienced with the law including, but not limited to any arrests, convictions, and/or sentences. *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.legalProblems || ''}
          onChangeText={(value) => updateField('legalProblems', value)}
          placeholder={tf("List any legal problems (or N/A)")}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Jail Time */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you or your spouse/partner ever served time in jail? If yes, how much time did you serve and for what? *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.jailTime || ''}
          onChangeText={(value) => updateField('jailTime', value)}
          placeholder={tf("Jail time details (or N/A)")}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Nearest Airport */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Nearest airport to your home *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.nearestAirport || ''}
          onChangeText={(value) => updateField('nearestAirport', value)}
          placeholder={tf("Airport name (e.g., LAX)")}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How many miles is it from your home? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.airportDistance || ''}
          onChangeText={(value) => updateField('airportDistance', value)}
          placeholder={tf("Distance in miles (e.g., 100)")}
          keyboardType="numeric"
        />
      </View>

      {/* Pets */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you have any pets? If yes, please list. *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.pets || ''}
          onChangeText={(value) => updateField('pets', value)}
          placeholder={tf("List pets (or N/A)")}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Current Living Situation */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Current Living Situation *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.livingSituation === 'own' && styles.radioButtonSelected]}
            onPress={() => updateField('livingSituation', 'own')}
          >
            <Text style={[styles.radioText, applicationData.livingSituation === 'own' && styles.radioTextSelected]}>{tf("I own the place I live in")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.livingSituation === 'family' && styles.radioButtonSelected]}
            onPress={() => updateField('livingSituation', 'family')}
          >
            <Text style={[styles.radioText, applicationData.livingSituation === 'family' && styles.radioTextSelected]}>{tf("I live with family members")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.livingSituation === 'rent' && styles.radioButtonSelected]}
            onPress={() => updateField('livingSituation', 'rent')}
          >
            <Text style={[styles.radioText, applicationData.livingSituation === 'rent' && styles.radioTextSelected]}>{tf("I rent the place I live in")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Own or Lease Car */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you own or lease a car? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.ownCar === true && styles.radioButtonSelected]}
            onPress={() => updateField('ownCar', true)}
          >
            <Text style={[styles.radioText, applicationData.ownCar === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.ownCar === false && styles.radioButtonSelected]}
            onPress={() => updateField('ownCar', false)}
          >
            <Text style={[styles.radioText, applicationData.ownCar === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver's License */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you have a driver's license? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.driverLicense === true && styles.radioButtonSelected]}
            onPress={() => updateField('driverLicense', true)}
          >
            <Text style={[styles.radioText, applicationData.driverLicense === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.driverLicense === false && styles.radioButtonSelected]}
            onPress={() => updateField('driverLicense', false)}
          >
            <Text style={[styles.radioText, applicationData.driverLicense === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Car Insured */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Is your car insured? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.carInsured === true && styles.radioButtonSelected]}
            onPress={() => updateField('carInsured', true)}
          >
            <Text style={[styles.radioText, applicationData.carInsured === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.carInsured === false && styles.radioButtonSelected]}
            onPress={() => updateField('carInsured', false)}
          >
            <Text style={[styles.radioText, applicationData.carInsured === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transportation Method - Only show if no license */}
      {applicationData.driverLicense === false && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("If you do not have a license how will you get to all necessary appointments? *")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.transportationMethod || ''}
            onChangeText={(value) => updateField('transportationMethod', value)}
            placeholder={tf("How will you get to appointments?")}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Siblings Count */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How many siblings do you have? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.siblingsCount || ''}
          onChangeText={(value) => updateField('siblingsCount', value)}
          placeholder={tf("Number of siblings")}
          keyboardType="numeric"
        />
      </View>

      {/* Mother's Siblings Count */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How many siblings does your mother have? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.motherSiblingsCount || ''}
          onChangeText={(value) => updateField('motherSiblingsCount', value)}
          placeholder={tf("Number of mother's siblings")}
          keyboardType="numeric"
        />
    </View>
    </ScrollView>
  );

  // Helper function to render delivery form
  const renderDeliveryForm = (deliveryIndex) => {
    const delivery = applicationData.deliveries[deliveryIndex] || {};
    const syncLegacyBabyFields = (entry, babies) => {
      if (!babies || babies.length === 0) {
        entry.gender = '';
        entry.birthWeight = '';
        return;
      }
      entry.gender = babies.map((b) => b?.gender).filter(Boolean).join(', ');
      entry.birthWeight = babies.map((b) => b?.birthWeight).filter(Boolean).join(', ');
    };

    const updateDeliveryField = (field, value) => {
      const newDeliveries = [...(applicationData.deliveries || [])];
      if (!newDeliveries[deliveryIndex]) {
        newDeliveries[deliveryIndex] = {};
      }
      newDeliveries[deliveryIndex][field] = value;
      updateField('deliveries', newDeliveries);
    };

    const updateFetusesCount = (value) => {
      const newDeliveries = [...(applicationData.deliveries || [])];
      const entry = { ...(newDeliveries[deliveryIndex] || {}) };
      entry.fetusesCount = value;

      const count = Math.max(parseInt(value, 10) || 0, 0);
      let babies = Array.isArray(entry.babies) ? [...entry.babies] : [];
      // Migrate legacy single gender/weight into first baby slot
      if (babies.length === 0 && (entry.gender || entry.birthWeight) && count > 0) {
        babies = [{
          gender: entry.gender || '',
          birthWeight: entry.birthWeight || '',
        }];
      }
      while (babies.length < count) {
        babies.push({ gender: '', birthWeight: '' });
      }
      if (babies.length > count) {
        babies = babies.slice(0, count);
      }
      entry.babies = babies;
      syncLegacyBabyFields(entry, babies);
      newDeliveries[deliveryIndex] = entry;
      updateField('deliveries', newDeliveries);
    };

    const updateBabyField = (babyIndex, field, value) => {
      const newDeliveries = [...(applicationData.deliveries || [])];
      const entry = { ...(newDeliveries[deliveryIndex] || {}) };
      const babies = Array.isArray(entry.babies) ? entry.babies.map((b) => ({ ...b })) : [];
      while (babies.length <= babyIndex) {
        babies.push({ gender: '', birthWeight: '' });
      }
      babies[babyIndex] = { ...babies[babyIndex], [field]: value };
      entry.babies = babies;
      syncLegacyBabyFields(entry, babies);
      newDeliveries[deliveryIndex] = entry;
      updateField('deliveries', newDeliveries);
    };

    const fetusCount = Math.max(parseInt(delivery.fetusesCount, 10) || 0, 0);
    let babies = Array.isArray(delivery.babies) ? delivery.babies : [];
    if (babies.length === 0 && fetusCount > 0 && (delivery.gender || delivery.birthWeight)) {
      babies = [{ gender: delivery.gender || '', birthWeight: delivery.birthWeight || '' }];
    }

    return (
      <View key={deliveryIndex} style={{ marginBottom: 30, padding: 15, backgroundColor: '#F8F9FB', borderRadius: 12 }}>
        <Text style={[styles.label, { fontSize: 18, marginBottom: 15 }]}>Delivery #{deliveryIndex + 1}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Year *")}</Text>
        <TextInput
          style={styles.input}
            value={delivery.year || ''}
            onChangeText={(value) => updateDeliveryField('year', value)}
            placeholder={tf("Year")}
            keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("How Did You Conceive? *")}</Text>
        <TextInput
            style={styles.input}
            value={delivery.conceptionMethod || ''}
            onChangeText={(value) => updateDeliveryField('conceptionMethod', value)}
            placeholder={tf("e.g., Natural, IVF, IUI")}
        />
      </View>

      <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Date Of Delivery *")}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
        <TextInput
          style={styles.input}
                value={delivery.deliveryMonth || ''}
                onChangeText={(value) => updateDeliveryField('deliveryMonth', value)}
                placeholder={tf("Month")}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={delivery.deliveryDay || ''}
                onChangeText={(value) => updateDeliveryField('deliveryDay', value)}
                placeholder={tf("Day")}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={delivery.deliveryYear || ''}
                onChangeText={(value) => updateDeliveryField('deliveryYear', value)}
                placeholder={tf("Year")}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Weeks Of Gestation To Delivery *")}</Text>
          <TextInput
            style={styles.input}
            value={delivery.gestationWeeks || ''}
            onChangeText={(value) => updateDeliveryField('gestationWeeks', value)}
            placeholder={tf("Weeks")}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("No Of Fetuses *")}</Text>
          <TextInput
            style={styles.input}
            value={delivery.fetusesCount || ''}
            onChangeText={updateFetusesCount}
            placeholder={tf("Number of fetuses")}
            keyboardType="numeric"
          />
        </View>

        {fetusCount > 0 && Array.from({ length: fetusCount }).map((_, babyIndex) => {
          const baby = babies[babyIndex] || {};
          return (
            <View
              key={`baby-${deliveryIndex}-${babyIndex}`}
              style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' }}
            >
              <Text style={[styles.label, { fontSize: 16, marginBottom: 10 }]}>
                {tf("Baby")} #{babyIndex + 1}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("Birth Weight *")}</Text>
                <TextInput
                  style={styles.input}
                  value={baby.birthWeight || ''}
                  onChangeText={(value) => updateBabyField(babyIndex, 'birthWeight', value)}
                  placeholder={tf("e.g., 7 lbs 8 oz")}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{tf("Gender *")}</Text>
                <View style={styles.radioContainer}>
                  <TouchableOpacity
                    style={[styles.radioButton, baby.gender === 'boy' && styles.radioButtonSelected]}
                    onPress={() => updateBabyField(babyIndex, 'gender', 'boy')}
                  >
                    <Text style={[styles.radioText, baby.gender === 'boy' && styles.radioTextSelected]}>{tf("Boy")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, baby.gender === 'girl' && styles.radioButtonSelected]}
                    onPress={() => updateBabyField(babyIndex, 'gender', 'girl')}
                  >
                    <Text style={[styles.radioText, baby.gender === 'girl' && styles.radioTextSelected]}>{tf("Girl")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Pregnancy Resulted In *")}</Text>
          <TextInput
            style={styles.input}
            value={delivery.pregnancyResult || ''}
            onChangeText={(value) => updateDeliveryField('pregnancyResult', value)}
            placeholder={tf("e.g., Live birth, Stillbirth")}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Delivery Method *")}</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[styles.radioButton, delivery.deliveryMethod === 'vaginally' && styles.radioButtonSelected]}
              onPress={() => updateDeliveryField('deliveryMethod', 'vaginally')}
            >
              <Text style={[styles.radioText, delivery.deliveryMethod === 'vaginally' && styles.radioTextSelected]}>{tf("Vaginally")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, delivery.deliveryMethod === 'c-section' && styles.radioButtonSelected]}
              onPress={() => updateDeliveryField('deliveryMethod', 'c-section')}
            >
              <Text style={[styles.radioText, delivery.deliveryMethod === 'c-section' && styles.radioTextSelected]}>{tf("C-Section")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Complications")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={delivery.complications || ''}
            onChangeText={(value) => updateDeliveryField('complications', value)}
            placeholder={tf("Any complications during pregnancy or delivery")}
            multiline
            numberOfLines={3}
        />
      </View>
    </View>
  );
  };

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{tf("Pregnancy & Delivery History")}</Text>
      <Text style={styles.stepDescription}>{tf("Total Delivery Times (Count ONLY births at 20+ weeks)")}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Total Delivery Times *")}</Text>
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
          placeholder={tf("Number of deliveries (20+ weeks)")}
          keyboardType="numeric"
        />
      </View>

      {/* Render delivery forms based on totalDeliveries */}
      {applicationData.deliveries && applicationData.deliveries.length > 0 && (
    <View>
          {applicationData.deliveries.map((_, index) => renderDeliveryForm(index))}
        </View>
      )}
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{tf("Health Information")}</Text>
      <Text style={styles.stepDescription}>{tf("Please provide your health and medical details")}</Text>
      
      {/* Health Insurance */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you have health insurance? *")}</Text>
        <View style={styles.radioContainer}>
            <TouchableOpacity
            style={[styles.radioButton, applicationData.healthInsurance === true && styles.radioButtonSelected]}
            onPress={() => updateField('healthInsurance', true)}
            >
            <Text style={[styles.radioText, applicationData.healthInsurance === true && styles.radioTextSelected]}>{tf("YES")}</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.healthInsurance === false && styles.radioButtonSelected]}
            onPress={() => updateField('healthInsurance', false)}
          >
            <Text style={[styles.radioText, applicationData.healthInsurance === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.healthInsurance && (
        <>
      <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Does it have maternity coverage? *")}</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.maternityCoverage === true && styles.radioButtonSelected]}
                onPress={() => updateField('maternityCoverage', true)}
              >
                <Text style={[styles.radioText, applicationData.maternityCoverage === true && styles.radioTextSelected]}>{tf("YES")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.maternityCoverage === 'not_sure' && styles.radioButtonSelected]}
                onPress={() => updateField('maternityCoverage', 'not_sure')}
              >
                <Text style={[styles.radioText, applicationData.maternityCoverage === 'not_sure' && styles.radioTextSelected]}>{tf("Not Sure")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Insurance Details")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
              value={applicationData.insuranceDetails || ''}
              onChangeText={(value) => updateField('insuranceDetails', value)}
              placeholder={tf("Provider name, policy number, etc.")}
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Is your health insurance provided through a state agency or program?")}</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.stateAgencyInsurance === true && styles.radioButtonSelected]}
                onPress={() => updateField('stateAgencyInsurance', true)}
              >
                <Text style={[styles.radioText, applicationData.stateAgencyInsurance === true && styles.radioTextSelected]}>{tf("YES")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.stateAgencyInsurance === false && styles.radioButtonSelected]}
                onPress={() => updateField('stateAgencyInsurance', false)}
              >
                <Text style={[styles.radioText, applicationData.stateAgencyInsurance === false && styles.radioTextSelected]}>{tf("NO")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicationData.stateAgencyInsurance && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{tf("What state agency or program?")}</Text>
        <TextInput
          style={styles.input}
                value={applicationData.stateAgencyName || ''}
                onChangeText={(value) => updateField('stateAgencyName', value)}
                placeholder={tf("State agency or program name")}
        />
      </View>
          )}

      <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Do you pay for your health insurance privately or is it provided by an employer?")}</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.insurancePaymentMethod === 'privately' && styles.radioButtonSelected]}
                onPress={() => updateField('insurancePaymentMethod', 'privately')}
              >
                <Text style={[styles.radioText, applicationData.insurancePaymentMethod === 'privately' && styles.radioTextSelected]}>{tf("Privately")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, applicationData.insurancePaymentMethod === 'employer' && styles.radioButtonSelected]}
                onPress={() => updateField('insurancePaymentMethod', 'employer')}
              >
                <Text style={[styles.radioText, applicationData.insurancePaymentMethod === 'employer' && styles.radioTextSelected]}>{tf("Employer")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Delivery Hospital */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What hospital do you intend to deliver your surrogate pregnancy? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.deliveryHospital || ''}
          onChangeText={(value) => updateField('deliveryHospital', value)}
          placeholder={tf("Hospital name")}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you delivered at the previously listed hospital before? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.deliveredAtHospitalBefore === true && styles.radioButtonSelected]}
            onPress={() => updateField('deliveredAtHospitalBefore', true)}
          >
            <Text style={[styles.radioText, applicationData.deliveredAtHospitalBefore === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.deliveredAtHospitalBefore === false && styles.radioButtonSelected]}
            onPress={() => updateField('deliveredAtHospitalBefore', false)}
          >
            <Text style={[styles.radioText, applicationData.deliveredAtHospitalBefore === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Abnormal Pap Smear */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever had an abnormal pap smear? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.abnormalPapSmear === true && styles.radioButtonSelected]}
            onPress={() => updateField('abnormalPapSmear', true)}
          >
            <Text style={[styles.radioText, applicationData.abnormalPapSmear === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.abnormalPapSmear === false && styles.radioButtonSelected]}
            onPress={() => updateField('abnormalPapSmear', false)}
          >
            <Text style={[styles.radioText, applicationData.abnormalPapSmear === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menstrual Information */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do your menstrual cycles occur monthly? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.monthlyCycles === true && styles.radioButtonSelected]}
            onPress={() => updateField('monthlyCycles', true)}
          >
            <Text style={[styles.radioText, applicationData.monthlyCycles === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.monthlyCycles === false && styles.radioButtonSelected]}
            onPress={() => updateField('monthlyCycles', false)}
          >
            <Text style={[styles.radioText, applicationData.monthlyCycles === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How many days from the beginning of your period to the next month's first day of cycle?")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.cycleDays || ''}
          onChangeText={(value) => updateField('cycleDays', value)}
          placeholder={tf("Number of days")}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How many days does your period last?")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.periodDays || ''}
          onChangeText={(value) => updateField('periodDays', value)}
          placeholder={tf("Number of days")}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Date of Last Menstrual Period")}</Text>
        <DatePickerField
          value={applicationData.lastMenstrualPeriod || ''}
          onChange={(next) => updateField('lastMenstrualPeriod', next)}
          format="MM/DD/YYYY"
          placeholder={tf("MM/DD/YYYY")}
          style={styles.input}
        />
      </View>

      {/* Infertility Doctor */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever been seen by a doctor for infertility? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.infertilityDoctor === true && styles.radioButtonSelected]}
            onPress={() => updateField('infertilityDoctor', true)}
          >
            <Text style={[styles.radioText, applicationData.infertilityDoctor === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.infertilityDoctor === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('infertilityDoctor', false);
              updateField('infertilityDetails', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.infertilityDoctor === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.infertilityDoctor && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("If yes, please explain *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
            value={applicationData.infertilityDetails || ''}
            onChangeText={(value) => updateField('infertilityDetails', value)}
            placeholder={tf("Please explain")}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Smoking & Alcohol */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you currently or have you ever smoked cigarettes or ANY form of nicotine? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.smokingStatus === 'yes' && styles.radioButtonSelected]}
            onPress={() => updateField('smokingStatus', 'yes')}
          >
            <Text style={[styles.radioText, applicationData.smokingStatus === 'yes' && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.smokingStatus === 'no' && styles.radioButtonSelected]}
            onPress={() => updateField('smokingStatus', 'no')}
          >
            <Text style={[styles.radioText, applicationData.smokingStatus === 'no' && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.smokingStatus === 'yes' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Did you ever smoke during pregnancy?")}</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[styles.radioButton, applicationData.smokedDuringPregnancy === true && styles.radioButtonSelected]}
              onPress={() => updateField('smokedDuringPregnancy', true)}
            >
              <Text style={[styles.radioText, applicationData.smokedDuringPregnancy === true && styles.radioTextSelected]}>{tf("YES")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, applicationData.smokedDuringPregnancy === false && styles.radioButtonSelected]}
              onPress={() => updateField('smokedDuringPregnancy', false)}
            >
              <Text style={[styles.radioText, applicationData.smokedDuringPregnancy === false && styles.radioTextSelected]}>{tf("NO")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do any members of your household smoke cigarettes or ANY form of nicotine? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.householdSmoking === true && styles.radioButtonSelected]}
            onPress={() => updateField('householdSmoking', true)}
          >
            <Text style={[styles.radioText, applicationData.householdSmoking === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.householdSmoking === false && styles.radioButtonSelected]}
            onPress={() => updateField('householdSmoking', false)}
          >
            <Text style={[styles.radioText, applicationData.householdSmoking === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.householdSmoking && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Where and how often?")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
            value={applicationData.householdSmokingDetails || ''}
            onChangeText={(value) => updateField('householdSmokingDetails', value)}
            placeholder={tf("Details about household smoking")}
          multiline
          numberOfLines={2}
        />
      </View>
      )}

      {/* Household Marijuana */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you or any members of your household smoke or inject marijuana? *")}</Text>
        <View style={styles.radioContainer}>
            <TouchableOpacity
            style={[styles.radioButton, applicationData.householdMarijuana === true && styles.radioButtonSelected]}
            onPress={() => updateField('householdMarijuana', true)}
          >
            <Text style={[styles.radioText, applicationData.householdMarijuana === true && styles.radioTextSelected]}>{tf("YES")}</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.householdMarijuana === false && styles.radioButtonSelected]}
            onPress={() => updateField('householdMarijuana', false)}
          >
            <Text style={[styles.radioText, applicationData.householdMarijuana === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you drink alcohol? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.alcoholUsage === 'yes' && styles.radioButtonSelected]}
            onPress={() => updateField('alcoholUsage', 'yes')}
          >
            <Text style={[styles.radioText, applicationData.alcoholUsage === 'yes' && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.alcoholUsage === 'no' && styles.radioButtonSelected]}
            onPress={() => updateField('alcoholUsage', 'no')}
          >
            <Text style={[styles.radioText, applicationData.alcoholUsage === 'no' && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.alcoholUsage === 'yes' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("How much and how often?")}</Text>
        <TextInput
          style={styles.input}
            value={applicationData.alcoholFrequency || ''}
            onChangeText={(value) => updateField('alcoholFrequency', value)}
            placeholder={tf("Frequency and amount")}
        />
      </View>
      )}

      {/* Drug Use */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever used illegal drugs or unprescribed drugs? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.illegalDrugs === true && styles.radioButtonSelected]}
            onPress={() => updateField('illegalDrugs', true)}
          >
            <Text style={[styles.radioText, applicationData.illegalDrugs === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.illegalDrugs === false && styles.radioButtonSelected]}
            onPress={() => updateField('illegalDrugs', false)}
          >
            <Text style={[styles.radioText, applicationData.illegalDrugs === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
    </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Has your partner/husband used illegal drugs or unprescribed drugs? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.partnerIllegalDrugs === true && styles.radioButtonSelected]}
            onPress={() => updateField('partnerIllegalDrugs', true)}
          >
            <Text style={[styles.radioText, applicationData.partnerIllegalDrugs === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.partnerIllegalDrugs === false && styles.radioButtonSelected]}
            onPress={() => updateField('partnerIllegalDrugs', false)}
          >
            <Text style={[styles.radioText, applicationData.partnerIllegalDrugs === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Children Info */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Please list the Name(s), Age(s), and Gender(s) of your children *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.childrenList || ''}
          onChangeText={(value) => updateField('childrenList', value)}
          placeholder={tf("Name, Age, Gender for each child")}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Pregnancy Problems */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Did you suffer any emotional or physical problems during and/or after each of your pregnancies? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.pregnancyProblems === true && styles.radioButtonSelected]}
            onPress={() => updateField('pregnancyProblems', true)}
          >
            <Text style={[styles.radioText, applicationData.pregnancyProblems === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.pregnancyProblems === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('pregnancyProblems', false);
              updateField('pregnancyProblemsDetails', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.pregnancyProblems === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
    </View>
      </View>

      {applicationData.pregnancyProblems && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("If yes, please explain *")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.pregnancyProblemsDetails || ''}
            onChangeText={(value) => updateField('pregnancyProblemsDetails', value)}
            placeholder={tf("Please explain")}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Children Health Problems */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do any of your children have serious health problems? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.childrenHealthProblems === true && styles.radioButtonSelected]}
            onPress={() => updateField('childrenHealthProblems', true)}
          >
            <Text style={[styles.radioText, applicationData.childrenHealthProblems === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.childrenHealthProblems === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('childrenHealthProblems', false);
              updateField('childrenHealthDetails', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.childrenHealthProblems === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.childrenHealthProblems && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("If yes, please explain *")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.childrenHealthDetails || ''}
            onChangeText={(value) => updateField('childrenHealthDetails', value)}
            placeholder={tf("Please explain")}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Breastfeeding */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you currently breastfeeding? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.breastfeeding === true && styles.radioButtonSelected]}
            onPress={() => updateField('breastfeeding', true)}
          >
            <Text style={[styles.radioText, applicationData.breastfeeding === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.breastfeeding === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('breastfeeding', false);
              updateField('breastfeedingStopDate', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.breastfeeding === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.breastfeeding && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("If so, when do you plan to stop?")}</Text>
          <DatePickerField
            value={applicationData.breastfeedingStopDate || ''}
            onChange={(next) => updateField('breastfeedingStopDate', next)}
            format="MM/DD/YYYY"
            placeholder={tf("Expected stop date")}
            style={styles.input}
          />
        </View>
      )}

      {/* Surgeries & Illnesses */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever had any surgery? *")}</Text>
        <View style={styles.radioContainer}>
            <TouchableOpacity
            style={[styles.radioButton, applicationData.surgeries === true && styles.radioButtonSelected]}
            onPress={() => updateField('surgeries', true)}
            >
            <Text style={[styles.radioText, applicationData.surgeries === true && styles.radioTextSelected]}>{tf("YES")}</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.surgeries === false && styles.radioButtonSelected]}
            onPress={() => updateField('surgeries', false)}
          >
            <Text style={[styles.radioText, applicationData.surgeries === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.surgeries && (
      <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Reason and results?")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
            value={applicationData.surgeryDetails || ''}
            onChangeText={(value) => updateField('surgeryDetails', value)}
            placeholder={tf("Surgery details")}
            multiline
            numberOfLines={3}
        />
      </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("List any serious illnesses you have")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.seriousIllnesses || ''}
          onChangeText={(value) => updateField('seriousIllnesses', value)}
          placeholder={tf("Serious illnesses (or N/A)")}
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("List all hospitalizations (except for childbirth)")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.hospitalizations || ''}
          onChangeText={(value) => updateField('hospitalizations', value)}
          placeholder={tf("Hospitalizations (or N/A)")}
          multiline
          numberOfLines={2}
        />
    </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("List all medications that you are presently taking and for what reason")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.currentMedications || ''}
          onChangeText={(value) => updateField('currentMedications', value)}
          placeholder={tf("Medications and reasons (or N/A)")}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Tattoos and Piercings */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you had a tattoo or body piercing in the last year and a half? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.tattoosPiercings === true && styles.radioButtonSelected]}
            onPress={() => updateField('tattoosPiercings', true)}
          >
            <Text style={[styles.radioText, applicationData.tattoosPiercings === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.tattoosPiercings === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('tattoosPiercings', false);
              updateField('tattoosPiercingsDate', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.tattoosPiercings === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.tattoosPiercings && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("If yes, when? *")}</Text>
          <DatePickerField
            value={applicationData.tattoosPiercingsDate || ''}
            onChange={(next) => updateField('tattoosPiercingsDate', next)}
            format="MM/DD/YYYY"
            placeholder={tf("Date (MM/DD/YYYY)")}
            style={styles.input}
          />
        </View>
      )}

      {/* Mental Health */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever been seen by a professional for mental health issues? *")}</Text>
        <View style={styles.radioContainer}>
            <TouchableOpacity
            style={[styles.radioButton, applicationData.mentalHealthTreatment === true && styles.radioButtonSelected]}
            onPress={() => updateField('mentalHealthTreatment', true)}
            >
            <Text style={[styles.radioText, applicationData.mentalHealthTreatment === true && styles.radioTextSelected]}>{tf("YES")}</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.mentalHealthTreatment === false && styles.radioButtonSelected]}
            onPress={() => updateField('mentalHealthTreatment', false)}
          >
            <Text style={[styles.radioText, applicationData.mentalHealthTreatment === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.mentalHealthTreatment && (
      <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Please explain and list time periods")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
            value={applicationData.mentalHealthDetails || ''}
            onChangeText={(value) => updateField('mentalHealthDetails', value)}
            placeholder={tf("Details and time periods")}
          multiline
          numberOfLines={3}
        />
      </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever experienced any postpartum depression? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.postpartumDepression === true && styles.radioButtonSelected]}
            onPress={() => updateField('postpartumDepression', true)}
          >
            <Text style={[styles.radioText, applicationData.postpartumDepression === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.postpartumDepression === false && styles.radioButtonSelected]}
            onPress={() => updateField('postpartumDepression', false)}
          >
            <Text style={[styles.radioText, applicationData.postpartumDepression === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
    </View>
      </View>

      {applicationData.postpartumDepression && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Please give the details and time periods")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.postpartumDepressionDetails || ''}
            onChangeText={(value) => updateField('postpartumDepressionDetails', value)}
            placeholder={tf("Details and time periods")}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Depression Medication */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever been prescribed any medication for depression or mental health? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.depressionMedication === true && styles.radioButtonSelected]}
            onPress={() => updateField('depressionMedication', true)}
          >
            <Text style={[styles.radioText, applicationData.depressionMedication === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.depressionMedication === false && styles.radioButtonSelected]}
            onPress={() => {
              updateField('depressionMedication', false);
              updateField('depressionMedicationDetails', '');
            }}
          >
            <Text style={[styles.radioText, applicationData.depressionMedication === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.depressionMedication && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("If yes, please list medication name, reason for use and dates of use *")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.depressionMedicationDetails || ''}
            onChangeText={(value) => updateField('depressionMedicationDetails', value)}
            placeholder={tf("Medication name, reason, and dates of use")}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Drug or Alcohol Abuse */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever had any problems with drug or alcohol abuse? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.drugAlcoholAbuse === true && styles.radioButtonSelected]}
            onPress={() => updateField('drugAlcoholAbuse', true)}
          >
            <Text style={[styles.radioText, applicationData.drugAlcoholAbuse === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.drugAlcoholAbuse === false && styles.radioButtonSelected]}
            onPress={() => updateField('drugAlcoholAbuse', false)}
          >
            <Text style={[styles.radioText, applicationData.drugAlcoholAbuse === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Excess Heat */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you exposed to excess heat in the way of saunas, hot tubs and/or steam rooms? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.excessHeat === true && styles.radioButtonSelected]}
            onPress={() => updateField('excessHeat', true)}
          >
            <Text style={[styles.radioText, applicationData.excessHeat === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.excessHeat === false && styles.radioButtonSelected]}
            onPress={() => updateField('excessHeat', false)}
          >
            <Text style={[styles.radioText, applicationData.excessHeat === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Alcohol Limit Advised */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever been advised to limit your use of alcohol or any other drug? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.alcoholLimitAdvised === true && styles.radioButtonSelected]}
            onPress={() => updateField('alcoholLimitAdvised', true)}
          >
            <Text style={[styles.radioText, applicationData.alcoholLimitAdvised === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.alcoholLimitAdvised === false && styles.radioButtonSelected]}
            onPress={() => updateField('alcoholLimitAdvised', false)}
          >
            <Text style={[styles.radioText, applicationData.alcoholLimitAdvised === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vaccinations */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you been vaccinated for Hepatitis B? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.hepatitisBVaccinated === true && styles.radioButtonSelected]}
            onPress={() => updateField('hepatitisBVaccinated', true)}
          >
            <Text style={[styles.radioText, applicationData.hepatitisBVaccinated === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.hepatitisBVaccinated === false && styles.radioButtonSelected]}
            onPress={() => updateField('hepatitisBVaccinated', false)}
          >
            <Text style={[styles.radioText, applicationData.hepatitisBVaccinated === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you have any allergies? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.allergies === true && styles.radioButtonSelected]}
            onPress={() => updateField('allergies', true)}
          >
            <Text style={[styles.radioText, applicationData.allergies === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.allergies === false && styles.radioButtonSelected]}
            onPress={() => updateField('allergies', false)}
          >
            <Text style={[styles.radioText, applicationData.allergies === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.allergies && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Please explain in detail")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.allergiesDetails || ''}
            onChangeText={(value) => updateField('allergiesDetails', value)}
            placeholder={tf("Allergy details")}
            multiline
            numberOfLines={2}
          />
        </View>
      )}
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{tf("Sexual History")}</Text>
      <Text style={styles.stepDescription}>{tf("Please provide your sexual health information")}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("List any contraceptives you have used in the past and any reaction you have had to the use of the contraceptive including Tubal Ligation. *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.pastContraceptives || ''}
          onChangeText={(value) => updateField('pastContraceptives', value)}
          placeholder={tf("List contraceptives used, reactions, and Tubal Ligation if applicable")}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you currently using birth control? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.currentBirthControl === true && styles.radioButtonSelected]}
            onPress={() => updateField('currentBirthControl', true)}
          >
            <Text style={[styles.radioText, applicationData.currentBirthControl === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.currentBirthControl === false && styles.radioButtonSelected]}
            onPress={() => updateField('currentBirthControl', false)}
          >
            <Text style={[styles.radioText, applicationData.currentBirthControl === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.currentBirthControl && (
        <>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Which method do you use?")}</Text>
        <TextInput
          style={styles.input}
              value={applicationData.birthControlMethod || ''}
              onChangeText={(value) => updateField('birthControlMethod', value)}
              placeholder={tf("Birth control method")}
        />
      </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("How long have you been using this method?")}</Text>
            <TextInput
              style={styles.input}
              value={applicationData.birthControlDuration || ''}
              onChangeText={(value) => updateField('birthControlDuration', value)}
              placeholder={tf("Duration")}
            />
          </View>
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you with a sexual partner now? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.sexualPartner === true && styles.radioButtonSelected]}
            onPress={() => updateField('sexualPartner', true)}
          >
            <Text style={[styles.radioText, applicationData.sexualPartner === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.sexualPartner === false && styles.radioButtonSelected]}
            onPress={() => updateField('sexualPartner', false)}
          >
            <Text style={[styles.radioText, applicationData.sexualPartner === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you currently have more than one sexual partner? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.multiplePartners === true && styles.radioButtonSelected]}
            onPress={() => updateField('multiplePartners', true)}
          >
            <Text style={[styles.radioText, applicationData.multiplePartners === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.multiplePartners === false && styles.radioButtonSelected]}
            onPress={() => updateField('multiplePartners', false)}
          >
            <Text style={[styles.radioText, applicationData.multiplePartners === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How many sexual partners have you had in the last three years? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.partnersLastThreeYears || ''}
          onChangeText={(value) => updateField('partnersLastThreeYears', value)}
          placeholder={tf("Number of partners")}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("In the past 10 years have you had sexual contact with anyone in a high-risk group for HIV or AIDS? *")}</Text>
        <Text style={styles.subLabel}>{tf("Including sexually active partners with multiple partners and partners who have used illegal drugs")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.highRiskHIVContact === true && styles.radioButtonSelected]}
            onPress={() => updateField('highRiskHIVContact', true)}
          >
            <Text style={[styles.radioText, applicationData.highRiskHIVContact === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.highRiskHIVContact === false && styles.radioButtonSelected]}
            onPress={() => updateField('highRiskHIVContact', false)}
          >
            <Text style={[styles.radioText, applicationData.highRiskHIVContact === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you at risk for HIV or AIDS? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.hivRisk === true && styles.radioButtonSelected]}
            onPress={() => updateField('hivRisk', true)}
          >
            <Text style={[styles.radioText, applicationData.hivRisk === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.hivRisk === false && styles.radioButtonSelected]}
            onPress={() => updateField('hivRisk', false)}
          >
            <Text style={[styles.radioText, applicationData.hivRisk === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever received a blood transfusion? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.bloodTransfusion === true && styles.radioButtonSelected]}
            onPress={() => updateField('bloodTransfusion', true)}
          >
            <Text style={[styles.radioText, applicationData.bloodTransfusion === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.bloodTransfusion === false && styles.radioButtonSelected]}
            onPress={() => updateField('bloodTransfusion', false)}
          >
            <Text style={[styles.radioText, applicationData.bloodTransfusion === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever had or have a sexually transmitted infection or disease? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.stdHistory === true && styles.radioButtonSelected]}
            onPress={() => updateField('stdHistory', true)}
          >
            <Text style={[styles.radioText, applicationData.stdHistory === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.stdHistory === false && styles.radioButtonSelected]}
            onPress={() => updateField('stdHistory', false)}
          >
            <Text style={[styles.radioText, applicationData.stdHistory === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.stdHistory && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{tf("Please explain")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
            value={applicationData.stdDetails || ''}
            onChangeText={(value) => updateField('stdDetails', value)}
            placeholder={tf("STD/STI details")}
          multiline
          numberOfLines={3}
        />
      </View>
      )}
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{tf("Employment Information")}</Text>
      <Text style={styles.stepDescription}>{tf("Please provide your employment details")}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Please list your current place of employment. Include (1) position held, (2) date of employment and (3) location of employer. If not applicable please state \"N/A\". *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.currentEmployment || ''}
          onChangeText={(value) => updateField('currentEmployment', value)}
          placeholder={tf("Position, start date, employer location (or N/A)")}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What is your current monthly income? *")}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, marginRight: 5, color: '#333' }}>$</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={applicationData.monthlyIncome || ''}
            onChangeText={(value) => updateField('monthlyIncome', value)}
            placeholder={tf("Monthly income (USD)")}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Spouse/Partner Employment - Only show if married */}
      {(applicationData.isMarried === true || applicationData.maritalStatus === 'married') && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("Please list your husband/partner's current place of employment. Include (1) position held, (2) date of employment and (3) location of employer. If not applicable please state \"N/A\". *")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={applicationData.spouseEmployment || ''}
              onChangeText={(value) => updateField('spouseEmployment', value)}
              placeholder={tf("Position, start date, employer location (or N/A)")}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tf("What is your Spouse's/Partner's current monthly income? *")}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginRight: 5, color: '#333' }}>$</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={applicationData.spouseMonthlyIncome || ''}
                onChangeText={(value) => updateField('spouseMonthlyIncome', value)}
                placeholder={tf("Monthly income (USD)")}
                keyboardType="numeric"
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How many persons do you support including yourself? *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.personsSupported || ''}
          onChangeText={(value) => updateField('personsSupported', value)}
          placeholder={tf("Number of persons")}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you receiving food stamps or any other public assistance? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.publicAssistance === true && styles.radioButtonSelected]}
            onPress={() => updateField('publicAssistance', true)}
          >
            <Text style={[styles.radioText, applicationData.publicAssistance === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.publicAssistance === false && styles.radioButtonSelected]}
            onPress={() => updateField('publicAssistance', false)}
          >
            <Text style={[styles.radioText, applicationData.publicAssistance === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How many people are currently living in your home? *")}</Text>
        <Text style={styles.subLabel}>{tf("If other than your children, husband/spouse, who are they?")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.householdMembers || ''}
          onChangeText={(value) => updateField('householdMembers', value)}
          placeholder={tf("Number and description of household members")}
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );

  const renderStep6 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{tf("Education History")}</Text>
      <Text style={styles.stepDescription}>{tf("Please provide your education background")}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What was your highest level of education obtained? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.educationLevel === 'highSchool' && styles.radioButtonSelected]}
            onPress={() => updateField('educationLevel', 'highSchool')}
          >
            <Text style={[styles.radioText, applicationData.educationLevel === 'highSchool' && styles.radioTextSelected]}>{tf("High School")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.educationLevel === 'college' && styles.radioButtonSelected]}
            onPress={() => updateField('educationLevel', 'college')}
          >
            <Text style={[styles.radioText, applicationData.educationLevel === 'college' && styles.radioTextSelected]}>{tf("College")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trade School Details */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("If you completed your education through a trade school, please specify.")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.tradeSchoolDetails || ''}
          onChangeText={(value) => updateField('tradeSchoolDetails', value)}
          placeholder={tf("Specify trade school details")}
          multiline
          numberOfLines={3}
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
      <Text style={styles.stepTitle}>{tf("General Questions")}</Text>
      <Text style={styles.stepDescription}>{tf("Please answer the following questions")}</Text>

      {/* 1. Understanding and Motivation */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Briefly explain your understanding of what being a gestational carrier will entail? and your motivation for becoming a surrogate mother. *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.surrogacyUnderstanding || ''}
          onChangeText={(value) => updateField('surrogacyUnderstanding', value)}
          placeholder={tf("Your understanding and motivation")}
          multiline
          numberOfLines={5}
        />
      </View>

      {/* 2. Self Introduction */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Generally please introduce yourself: personality, hobbies, interests, family support.......? *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.selfIntroduction || ''}
          onChangeText={(value) => updateField('selfIntroduction', value)}
          placeholder={tf("Tell us about yourself")}
          multiline
          numberOfLines={5}
        />
      </View>

      {/* 3. Main Concerns */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What are your main concerns about the surrogacy process? *")}</Text>
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
                {isSelected ? '✓ ' : '○ '}{tf(concern)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. Parent Qualities */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What qualities if any would you consider most important that the parents you choose will have? *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.parentQualities || ''}
          onChangeText={(value) => updateField('parentQualities', value)}
          placeholder={tf("Describe important qualities in intended parents")}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* 5. Religious Preference */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you have any preferences for the religious background of the parents? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.religiousPreference === true && styles.radioButtonSelected]}
            onPress={() => updateField('religiousPreference', true)}
          >
            <Text style={[styles.radioText, applicationData.religiousPreference === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.religiousPreference === false && styles.radioButtonSelected]}
            onPress={() => updateField('religiousPreference', false)}
          >
            <Text style={[styles.radioText, applicationData.religiousPreference === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 6. Unmarried Couple */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with an unmarried couple or person? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.unmarriedCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('unmarriedCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.unmarriedCouple === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.unmarriedCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('unmarriedCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.unmarriedCouple === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 7. Heterosexual Couple */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with a heterosexual couple? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.heterosexualCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('heterosexualCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.heterosexualCouple === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.heterosexualCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('heterosexualCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.heterosexualCouple === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 11. Egg Donor */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with a couple using an egg donor? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.eggDonor === true && styles.radioButtonSelected]}
            onPress={() => updateField('eggDonor', true)}
          >
            <Text style={[styles.radioText, applicationData.eggDonor === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.eggDonor === false && styles.radioButtonSelected]}
            onPress={() => updateField('eggDonor', false)}
          >
            <Text style={[styles.radioText, applicationData.eggDonor === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 12. Sperm Donor */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with a couple using a sperm donor? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.spermDonor === true && styles.radioButtonSelected]}
            onPress={() => updateField('spermDonor', true)}
          >
            <Text style={[styles.radioText, applicationData.spermDonor === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.spermDonor === false && styles.radioButtonSelected]}
            onPress={() => updateField('spermDonor', false)}
          >
            <Text style={[styles.radioText, applicationData.spermDonor === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 13. Older Couple */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with an older couple? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.olderCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('olderCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.olderCouple === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.olderCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('olderCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.olderCouple === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 14. Couple With Children */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with a couple with children? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.coupleWithChildren === true && styles.radioButtonSelected]}
            onPress={() => updateField('coupleWithChildren', true)}
          >
            <Text style={[styles.radioText, applicationData.coupleWithChildren === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.coupleWithChildren === false && styles.radioButtonSelected]}
            onPress={() => updateField('coupleWithChildren', false)}
          >
            <Text style={[styles.radioText, applicationData.coupleWithChildren === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 8. Same Sex Couple */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with a same sex couple? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.sameSexCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('sameSexCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.sameSexCouple === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.sameSexCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('sameSexCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.sameSexCouple === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 9. Single Male */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with a single male? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.singleMale === true && styles.radioButtonSelected]}
            onPress={() => updateField('singleMale', true)}
          >
            <Text style={[styles.radioText, applicationData.singleMale === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.singleMale === false && styles.radioButtonSelected]}
            onPress={() => updateField('singleMale', false)}
          >
            <Text style={[styles.radioText, applicationData.singleMale === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 10. Single Female */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with a single female? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.singleFemale === true && styles.radioButtonSelected]}
            onPress={() => updateField('singleFemale', true)}
          >
            <Text style={[styles.radioText, applicationData.singleFemale === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.singleFemale === false && styles.radioButtonSelected]}
            onPress={() => updateField('singleFemale', false)}
          >
            <Text style={[styles.radioText, applicationData.singleFemale === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 15. International Couple */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with an international couple? (a couple living outside of the United States) *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.internationalCouple === true && styles.radioButtonSelected]}
            onPress={() => updateField('internationalCouple', true)}
          >
            <Text style={[styles.radioText, applicationData.internationalCouple === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.internationalCouple === false && styles.radioButtonSelected]}
            onPress={() => updateField('internationalCouple', false)}
          >
            <Text style={[styles.radioText, applicationData.internationalCouple === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 16. Non-English Speaking */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to work with a non-English speaking couple using a translator? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.nonEnglishSpeaking === true && styles.radioButtonSelected]}
            onPress={() => updateField('nonEnglishSpeaking', true)}
          >
            <Text style={[styles.radioText, applicationData.nonEnglishSpeaking === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.nonEnglishSpeaking === false && styles.radioButtonSelected]}
            onPress={() => updateField('nonEnglishSpeaking', false)}
          >
            <Text style={[styles.radioText, applicationData.nonEnglishSpeaking === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 17. Carry Twins */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you willing to carry twins? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.carryTwins === true && styles.radioButtonSelected]}
            onPress={() => updateField('carryTwins', true)}
          >
            <Text style={[styles.radioText, applicationData.carryTwins === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.carryTwins === false && styles.radioButtonSelected]}
            onPress={() => updateField('carryTwins', false)}
          >
            <Text style={[styles.radioText, applicationData.carryTwins === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 18. Reduction Willing */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("In the case of a multiples pregnancy, are you willing to reduce the pregnancy from 3 to 2 or 1? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.reductionWilling === true && styles.radioButtonSelected]}
            onPress={() => updateField('reductionWilling', true)}
          >
            <Text style={[styles.radioText, applicationData.reductionWilling === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.reductionWilling === false && styles.radioButtonSelected]}
            onPress={() => updateField('reductionWilling', false)}
          >
            <Text style={[styles.radioText, applicationData.reductionWilling === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 19. Amniocentesis */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Would you be willing to undergo amniocentesis or other diagnostic testing to determine the presence of birth defects? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.amniocentesis === true && styles.radioButtonSelected]}
            onPress={() => updateField('amniocentesis', true)}
          >
            <Text style={[styles.radioText, applicationData.amniocentesis === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.amniocentesis === false && styles.radioButtonSelected]}
            onPress={() => updateField('amniocentesis', false)}
          >
            <Text style={[styles.radioText, applicationData.amniocentesis === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 20. Abortion Willing */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("If there were a serious problem with the fetus and the parents wanted to abort would you be willing to abort in the presence of birth defects? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.abortionWilling === true && styles.radioButtonSelected]}
            onPress={() => updateField('abortionWilling', true)}
          >
            <Text style={[styles.radioText, applicationData.abortionWilling === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.abortionWilling === false && styles.radioButtonSelected]}
            onPress={() => updateField('abortionWilling', false)}
          >
            <Text style={[styles.radioText, applicationData.abortionWilling === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 23. Concerns Placing Baby */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you have any concerns about placing the baby with the parents after you give birth? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.concernsPlacingBaby === true && styles.radioButtonSelected]}
            onPress={() => updateField('concernsPlacingBaby', true)}
          >
            <Text style={[styles.radioText, applicationData.concernsPlacingBaby === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.concernsPlacingBaby === false && styles.radioButtonSelected]}
            onPress={() => updateField('concernsPlacingBaby', false)}
          >
            <Text style={[styles.radioText, applicationData.concernsPlacingBaby === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 24. Parents In Delivery Room */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Will you permit the parents in the delivery room? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsInDeliveryRoom === true && styles.radioButtonSelected]}
            onPress={() => updateField('parentsInDeliveryRoom', true)}
          >
            <Text style={[styles.radioText, applicationData.parentsInDeliveryRoom === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsInDeliveryRoom === false && styles.radioButtonSelected]}
            onPress={() => updateField('parentsInDeliveryRoom', false)}
          >
            <Text style={[styles.radioText, applicationData.parentsInDeliveryRoom === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 25. Parents At Appointments */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Will you permit the parents to attend doctor appointments if they want to attend? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsAtAppointments === true && styles.radioButtonSelected]}
            onPress={() => updateField('parentsAtAppointments', true)}
          >
            <Text style={[styles.radioText, applicationData.parentsAtAppointments === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsAtAppointments === false && styles.radioButtonSelected]}
            onPress={() => updateField('parentsAtAppointments', false)}
          >
            <Text style={[styles.radioText, applicationData.parentsAtAppointments === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 26. Notify Hospital */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Will you permit the parents to notify the hospital that you are not the biological parent of the child? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.notifyHospital === true && styles.radioButtonSelected]}
            onPress={() => updateField('notifyHospital', true)}
          >
            <Text style={[styles.radioText, applicationData.notifyHospital === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.notifyHospital === false && styles.radioButtonSelected]}
            onPress={() => updateField('notifyHospital', false)}
          >
            <Text style={[styles.radioText, applicationData.notifyHospital === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 27. Parents On Birth Certificate */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Will you allow the parents' names to be placed on the birth certificate? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsOnBirthCertificate === true && styles.radioButtonSelected]}
            onPress={() => updateField('parentsOnBirthCertificate', true)}
          >
            <Text style={[styles.radioText, applicationData.parentsOnBirthCertificate === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.parentsOnBirthCertificate === false && styles.radioButtonSelected]}
            onPress={() => updateField('parentsOnBirthCertificate', false)}
          >
            <Text style={[styles.radioText, applicationData.parentsOnBirthCertificate === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 28. Applying Elsewhere */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you currently applying to be a gestational carrier at any other medical facility, agency, and facilitator, or independently? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.applyingElsewhere === true && styles.radioButtonSelected]}
            onPress={() => updateField('applyingElsewhere', true)}
          >
            <Text style={[styles.radioText, applicationData.applyingElsewhere === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.applyingElsewhere === false && styles.radioButtonSelected]}
            onPress={() => updateField('applyingElsewhere', false)}
          >
            <Text style={[styles.radioText, applicationData.applyingElsewhere === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 29. Rejected Elsewhere */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever applied to be a gestational carrier at any other medical facility and been told that you do not meet the criteria to be a gestational carrier? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.rejectedElsewhere === true && styles.radioButtonSelected]}
            onPress={() => updateField('rejectedElsewhere', true)}
          >
            <Text style={[styles.radioText, applicationData.rejectedElsewhere === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.rejectedElsewhere === false && styles.radioButtonSelected]}
            onPress={() => updateField('rejectedElsewhere', false)}
          >
            <Text style={[styles.radioText, applicationData.rejectedElsewhere === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 30. Attend Checkups */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you able to attend all prenatal check-ups on time? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.attendCheckups === true && styles.radioButtonSelected]}
            onPress={() => updateField('attendCheckups', true)}
          >
            <Text style={[styles.radioText, applicationData.attendCheckups === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.attendCheckups === false && styles.radioButtonSelected]}
            onPress={() => updateField('attendCheckups', false)}
          >
            <Text style={[styles.radioText, applicationData.attendCheckups === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 31. Receive Injections */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you willing to receive injections, medications, and ultrasounds as required? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.receiveInjections === true && styles.radioButtonSelected]}
            onPress={() => updateField('receiveInjections', true)}
          >
            <Text style={[styles.radioText, applicationData.receiveInjections === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.receiveInjections === false && styles.radioButtonSelected]}
            onPress={() => updateField('receiveInjections', false)}
          >
            <Text style={[styles.radioText, applicationData.receiveInjections === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 32. Medical Examinations */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you willing to undergo all medical examinations designated by the doctor? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.medicalExaminations === true && styles.radioButtonSelected]}
            onPress={() => updateField('medicalExaminations', true)}
          >
            <Text style={[styles.radioText, applicationData.medicalExaminations === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.medicalExaminations === false && styles.radioButtonSelected]}
            onPress={() => updateField('medicalExaminations', false)}
          >
            <Text style={[styles.radioText, applicationData.medicalExaminations === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 34. Avoid Long Travel */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you willing to avoid long-distance travel during pregnancy? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.avoidLongTravel === true && styles.radioButtonSelected]}
            onPress={() => updateField('avoidLongTravel', true)}
          >
            <Text style={[styles.radioText, applicationData.avoidLongTravel === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.avoidLongTravel === false && styles.radioButtonSelected]}
            onPress={() => updateField('avoidLongTravel', false)}
          >
            <Text style={[styles.radioText, applicationData.avoidLongTravel === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 33. Follow Guidelines */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you able to follow pregnancy-related lifestyle guidelines? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.followGuidelines === true && styles.radioButtonSelected]}
            onPress={() => updateField('followGuidelines', true)}
          >
            <Text style={[styles.radioText, applicationData.followGuidelines === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.followGuidelines === false && styles.radioButtonSelected]}
            onPress={() => updateField('followGuidelines', false)}
          >
            <Text style={[styles.radioText, applicationData.followGuidelines === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 35. Avoid High Risk Work */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Are you willing to refrain from high-risk work during pregnancy? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.avoidHighRiskWork === true && styles.radioButtonSelected]}
            onPress={() => updateField('avoidHighRiskWork', true)}
          >
            <Text style={[styles.radioText, applicationData.avoidHighRiskWork === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.avoidHighRiskWork === false && styles.radioButtonSelected]}
            onPress={() => updateField('avoidHighRiskWork', false)}
          >
            <Text style={[styles.radioText, applicationData.avoidHighRiskWork === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 36. Placed Child Adoption */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Have you ever placed a child up for adoption? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.placedChildAdoption === true && styles.radioButtonSelected]}
            onPress={() => updateField('placedChildAdoption', true)}
          >
            <Text style={[styles.radioText, applicationData.placedChildAdoption === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.placedChildAdoption === false && styles.radioButtonSelected]}
            onPress={() => updateField('placedChildAdoption', false)}
          >
            <Text style={[styles.radioText, applicationData.placedChildAdoption === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 37. Expected Support */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How much contact would you like to have with the parents throughout the process? *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.contactDuringProcess || ''}
          onChangeText={(value) => updateField('contactDuringProcess', value)}
          placeholder={tf("Describe your preferred level of contact")}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* 22. Contact After Birth */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How much contact would you like to have with the parents after the birth? *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.contactAfterBirth || ''}
          onChangeText={(value) => updateField('contactAfterBirth', value)}
          placeholder={tf("Describe your preferred level of contact after birth")}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* 37. Expected Support */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("What kind of support do you expect to have while being a gestational carrier from intended parents, and our agency? Please be specific. *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.expectedSupport || ''}
          onChangeText={(value) => updateField('expectedSupport', value)}
          placeholder={tf("Please be specific")}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* 38. Unsupportive People */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Is there anyone important in your life that is not supportive of you considering becoming a gestational surrogate? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.unsupportivePeople === true && styles.radioButtonSelected]}
            onPress={() => updateField('unsupportivePeople', true)}
          >
            <Text style={[styles.radioText, applicationData.unsupportivePeople === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.unsupportivePeople === false && styles.radioButtonSelected]}
            onPress={() => updateField('unsupportivePeople', false)}
          >
            <Text style={[styles.radioText, applicationData.unsupportivePeople === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 39. Partner Feelings */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("How does your husband/partner feel about your participating in the surrogacy process? *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.partnerFeelings || ''}
          onChangeText={(value) => updateField('partnerFeelings', value)}
          placeholder={tf("Partner's feelings about surrogacy")}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* 40. Childcare Support */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Do you feel like you will have the necessary support to be able to find adequate child care for all appointments you will be required to attend? *")}</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.childcareSupport === true && styles.radioButtonSelected]}
            onPress={() => updateField('childcareSupport', true)}
          >
            <Text style={[styles.radioText, applicationData.childcareSupport === true && styles.radioTextSelected]}>{tf("YES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.childcareSupport === false && styles.radioButtonSelected]}
            onPress={() => updateField('childcareSupport', false)}
          >
            <Text style={[styles.radioText, applicationData.childcareSupport === false && styles.radioTextSelected]}>{tf("NO")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    );
  };

  const renderStep8 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>{tf("Authorization for Release of Information")}</Text>
      <Text style={styles.stepDescription}>{tf("Please review and confirm")}</Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { lineHeight: 22 }]}>
          {tf("I hereby authorize Babytree Surrogacy to disclose the information contained in this Surrogate Application to anyone interested in reviewing my application to assist them in selecting a Surrogate, and for review by appropriate medical and psychological professionals and their staffs. I understand, and expressly condition this authorization upon such understanding. *")}
        </Text>
        <TouchableOpacity
          style={[styles.checkboxContainer, { marginTop: 15 }]}
          onPress={() => updateField('authorizationAgreed', !applicationData.authorizationAgreed)}
        >
          <Text style={[styles.checkboxText, applicationData.authorizationAgreed && styles.checkboxTextSelected]}>
            {applicationData.authorizationAgreed ? '✓ ' : '○ '}{tf("I Agree")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Applicant Information */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Applicant Name *")}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={applicationData.firstName || ''}
            placeholder={tf("First Name")}
            editable={false}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={applicationData.lastName || ''}
            placeholder={tf("Last Name")}
            editable={false}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Application Date")}</Text>
        <TextInput
          style={styles.input}
          value={new Date().toLocaleDateString('en-US')}
          editable={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Applicant Email *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.email || ''}
          onChangeText={(value) => updateField('email', value)}
          placeholder={tf("Email")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
    </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Applicant Phone Number *")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.phoneNumber || ''}
          onChangeText={(value) => updateField('phoneNumber', value)}
          placeholder={tf("Phone")}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Applicant Address *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.address || ''}
          onChangeText={(value) => updateField('address', value)}
          placeholder={tf("Street Address, City, State, Zip Code")}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Emergency Contact person's name, relationship and Phone Number *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.emergencyContact || ''}
          onChangeText={(value) => updateField('emergencyContact', value)}
          placeholder={tf("Name, Relationship, Phone Number")}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Referral Code */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Referral Code (Optional)")}</Text>
        <Text style={styles.subLabel}>{tf("If you were referred by someone, enter their invite code")}</Text>
        <TextInput
          style={styles.input}
          value={applicationData.referralCode || ''}
          onChangeText={(value) => updateField('referralCode', value)}
          placeholder={tf("Enter referral code (optional)")}
          autoCapitalize="none"
        />
      </View>

      {/* Surrogate Lifestyle Photos Upload (6 photos) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{tf("Please upload your pictures *")}</Text>
        <Text style={styles.subLabel}>
          {tf("Upload limit: at least 1, maximum 6 photos. Images only (JPG, PNG, etc.).")}
          {' '}
          ({(photos || []).filter(Boolean).length}/6)
        </Text>
        <View style={styles.photosContainer}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const photo = photos[index];
            const photoUrl = photo?.url || (applicationData.photos && applicationData.photos[index]);
            
            return (
              <View key={index} style={styles.photoItemContainer}>
                {photoUrl || photo?.uri ? (
                  <View style={styles.photoItem}>
                    <Image
                      source={{ uri: photo?.uri || photoUrl }}
                      style={styles.photoThumbnail}
                    />
                    {photo?.uploading || uploadingPhotoIndex === index ? (
                      <View style={styles.uploadingOverlay} pointerEvents="box-none">
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.uploadingText}>{tf("Uploading...")}</Text>
                        <Text style={styles.uploadingCancelHint}>{tf("Tap × to cancel")}</Text>
                      </View>
                    ) : (
                      <View style={styles.photoInfo}>
                        <Text style={styles.photoFileName} numberOfLines={1}>
                          {photo?.fileName || `IMG_${index + 1}.jpeg`}
                        </Text>
                        {photo?.fileSize && (
                          <Text style={styles.photoFileSize}>
                            {formatFileSize(photo.fileSize)}
                          </Text>
                        )}
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="x" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.photoUploadSlot}
                    onPress={() => showPhotoPicker(index)}
                    disabled={uploadingPhotoIndex === index}
                  >
                    {uploadingPhotoIndex === index ? (
                      <ActivityIndicator size="small" color="#2A7BF6" />
                    ) : (
                      <>
                        <Icon name="camera" size={24} color="#2A7BF6" />
                        <Text style={styles.photoUploadSlotText}>{tf("Upload")}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
    </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.inputGroup, { marginTop: 20, padding: 15, backgroundColor: '#FFF3CD', borderRadius: 12 }]}>
        <Text style={{ color: '#856404', fontSize: 14, lineHeight: 20 }}>
          {tf("By submitting this application, you confirm that all information provided is true and accurate to the best of your knowledge.")}
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
              onPress={handleSaveAndExit}
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

          {!editMode && (
            <TouchableOpacity style={styles.saveExitButton} onPress={handleSaveAndExit}>
              <Text style={styles.saveExitButtonText}>{t('application.saveAndExit')}</Text>
            </TouchableOpacity>
          )}

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
              <View style={styles.authPasswordRow}>
                <TextInput
                  style={styles.authPasswordInput}
                  placeholder={tf("Password")}
                  secureTextEntry={!showAuthPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                />
                <TouchableOpacity
                  style={styles.authEyeButton}
                  onPress={() => setShowAuthPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showAuthPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showAuthPassword ? 'eye' : 'eye-off'} size={20} color="#6E7191" />
                </TouchableOpacity>
              </View>
              <View style={styles.authPasswordRow}>
                <TextInput
                  style={styles.authPasswordInput}
                  placeholder={tf("Confirm Password")}
                  secureTextEntry={!showAuthPasswordConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={authPasswordConfirm}
                  onChangeText={setAuthPasswordConfirm}
                />
                <TouchableOpacity
                  style={styles.authEyeButton}
                  onPress={() => setShowAuthPasswordConfirm((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showAuthPasswordConfirm ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showAuthPasswordConfirm ? 'eye' : 'eye-off'} size={20} color="#6E7191" />
                </TouchableOpacity>
              </View>
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
  saveExitButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  saveExitButtonText: {
    color: '#2A7BF6',
    fontSize: 15,
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
  authPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7EE',
    paddingRight: 4,
  },
  authPasswordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1D1E',
  },
  authEyeButton: {
    padding: 10,
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
  // Photo upload styles
  photoContainer: {
    marginTop: 8,
  },
  photoUploadButton: {
    borderWidth: 2,
    borderColor: '#2A7BF6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FB',
  },
  photoUploadText: {
    marginTop: 8,
    fontSize: 16,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  photoPreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    marginTop: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadingCancelHint: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#2A7BF6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Multiple photos styles
  photosContainer: {
    marginTop: 8,
    gap: 12,
  },
  photoItemContainer: {
    marginBottom: 12,
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E7EE',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'cover',
  },
  photoInfo: {
    flex: 1,
    marginRight: 8,
  },
  photoFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  photoFileSize: {
    fontSize: 12,
    color: '#6E7191',
  },
  photoUploadSlot: {
    borderWidth: 2,
    borderColor: '#2A7BF6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FB',
    minHeight: 80,
  },
  photoUploadSlotText: {
    marginTop: 8,
    fontSize: 14,
    color: '#2A7BF6',
    fontWeight: '600',
  },
});

