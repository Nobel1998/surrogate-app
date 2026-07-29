import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, StatusBar, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { translateFormUi } from '../i18n/formUiStrings';
import { getClientIp } from '../utils/getClientIp';

/**
 * Split a signup/profile phone into Country Code / Area Code / local Phone Number.
 * Local number must not include country or area code.
 */
function splitPhoneForParentForm(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) {
    return { countryCode: '', areaCode: '', phoneNumber: '' };
  }

  let countryCode = '';
  // US/NANP: leading 1 + 10-digit national number
  if (digits.length >= 11 && digits.startsWith('1')) {
    countryCode = '1';
    digits = digits.slice(1);
  }

  let areaCode = '';
  let phoneNumber = digits;
  if (digits.length >= 10) {
    areaCode = digits.slice(0, 3);
    phoneNumber = digits.slice(3);
  }

  return { countryCode, areaCode, phoneNumber };
}

/** If Phone Number still holds a full number (10+ digits), re-split into the three fields. */
function normalizeParent1PhoneFields(data) {
  if (!data) return data;
  const phoneDigits = String(data.parent1PhoneNumber || '').replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return data;
  }
  const combined = [data.parent1PhoneCountryCode, data.parent1PhoneAreaCode, data.parent1PhoneNumber]
    .filter((v) => String(v || '').trim())
    .join(' ');
  const parts = splitPhoneForParentForm(combined || data.parent1PhoneNumber);
  return {
    ...data,
    parent1PhoneCountryCode: parts.countryCode || data.parent1PhoneCountryCode || '',
    parent1PhoneAreaCode: parts.areaCode || data.parent1PhoneAreaCode || '',
    parent1PhoneNumber: parts.phoneNumber,
  };
}

export default function IntendedParentApplicationScreen({ navigation, route }) {
  const { user, refreshUserProfile } = useAuth();
  const { t, language } = useLanguage();
  const tf = (text) => translateFormUi(language, text);
  
  // Edit mode parameters
  const editMode = route?.params?.editMode || false;
  const applicationId = route?.params?.applicationId || null;
  const existingData = route?.params?.existingData || null;
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
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
  
  // Refs for Step 1 scroll view and input fields
  const step1ScrollViewRef = useRef(null);
  const step1InputRefs = useRef({});
  
  // Generate invite code helper
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

  /** Map parent application form fields → profiles columns used by My Info */
  const formatParentPhoneForProfile = (data) => {
    const cc = String(data.parent1PhoneCountryCode || '')
      .trim()
      .replace(/^\+/, '');
    const area = String(data.parent1PhoneAreaCode || '').trim();
    const num = String(data.parent1PhoneNumber || '').trim();
    const parts = [];
    if (cc) parts.push(`(+${cc})`);
    if (area) parts.push(area);
    if (num) parts.push(num);
    return parts.join(' ').trim();
  };

  const buildParentProfileFromApplication = (data, { userId, email, inviteCode, signupIp } = {}) => {
    const first = (data.parent1FirstName || '').trim();
    const last = (data.parent1LastName || '').trim();
    const name = [first, last].filter(Boolean).join(' ').trim();

    const y = String(data.parent1DateOfBirthYear || '').trim();
    const m = String(data.parent1DateOfBirthMonth || '').trim().padStart(2, '0');
    const d = String(data.parent1DateOfBirthDay || '').trim().padStart(2, '0');
    let dateOfBirth = null;
    if (y.length === 4 && m !== '00' && d !== '00') {
      dateOfBirth = `${y}-${m}-${d}`;
    }

    const city = (data.parent1AddressCity || '').trim();
    const state = (data.parent1AddressState || '').trim();
    const street = (data.parent1AddressStreet || '').trim();
    const zip = (data.parent1AddressZip || '').trim();
    let location = '';
    if (city && state) location = `${city}, ${state}`;
    else if (city || state) location = city || state;
    else if (street) location = street;
    if (zip && location) location = `${location} ${zip}`;
    else if (zip) location = zip;

    const payload = {
      id: userId,
      name: name || undefined,
      phone: formatParentPhoneForProfile(data),
      email: (email || data.parent1Email || '').trim() || undefined,
      date_of_birth: dateOfBirth,
      location: location || '',
      race: (data.parent1Race || '').trim() || '',
      role: 'parent',
    };
    if (inviteCode) payload.invite_code = inviteCode;
    if (signupIp) payload.signup_ip = signupIp;
    // Drop undefined so we don't wipe existing name/email with empty upserts
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });
    return payload;
  };

  const syncParentProfileToMyInfo = async (userId, data, email) => {
    if (!userId) return { error: new Error('Missing user id') };

    let existingInviteCode = null;
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('invite_code')
        .eq('id', userId)
        .maybeSingle();
      existingInviteCode = existingProfile?.invite_code || null;
    } catch (_) {
      existingInviteCode = null;
    }

    const inviteCode = existingInviteCode || generateInviteCode();
    const payload = buildParentProfileFromApplication(data, {
      userId,
      email,
      inviteCode,
    });

    let attempts = 0;
    while (attempts < 3) {
      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });
      if (!error) return { error: null };
      if (error.code === '23505' && !existingInviteCode) {
        payload.invite_code = generateInviteCode();
        attempts += 1;
        continue;
      }
      return { error };
    }
    return { error: new Error('Failed to sync profile') };
  };
  
  const [applicationData, setApplicationData] = useState({
    // Step 1: Family Structure & Basic Information
    familyStructure: '', // married, domestic_partners, same_sex_couple, single_father, single_mother
    hearAboutUs: '', // google_search, youtube, online_resources, facebook, friend, other_agency, ai, clinic_referral
    
    // Intended Parent 1
    parent1FirstName: '',
    parent1LastName: '',
    parent1DateOfBirthMonth: '',
    parent1DateOfBirthDay: '',
    parent1DateOfBirthYear: '',
    parent1Gender: '', // male, female
    parent1BloodType: '',
    parent1Race: '',
    parent1Citizenship: '',
    parent1CountryState: '',
    parent1Occupation: '',
    parent1Languages: '',
    parent1PhoneCountryCode: '',
    parent1PhoneAreaCode: '',
    parent1PhoneNumber: '',
    parent1Email: user?.email || '',
    parent1EmergencyContact: '',
    parent1AddressStreet: '',
    parent1AddressStreet2: '',
    parent1AddressCity: '',
    parent1AddressState: '',
    parent1AddressZip: '',
    
    // Step 2: Intended Parent 2 (if applicable)
    parent2FirstName: '',
    parent2LastName: '',
    parent2DateOfBirthMonth: '',
    parent2DateOfBirthDay: '',
    parent2DateOfBirthYear: '',
    parent2Gender: '', // male, female
    parent2BloodType: '',
    parent2Race: '',
    parent2Citizenship: '',
    parent2CountryState: '',
    parent2Occupation: '',
    parent2Languages: '',
    parent2PhoneCountryCode: '',
    parent2PhoneAreaCode: '',
    parent2PhoneNumber: '',
    parent2Email: '',
    
    // Step 3: Family Background
    howLongTogether: '',
    haveChildren: null, // true, false
    childrenDetails: '', // ages, gender, IVF/surrogacy/natural birth
    
    // Step 4: Medical & Fertility History
    reasonForSurrogacy: [], // Array of: infertility_diagnosis, medical_condition, same_sex_couple, single_parent
    undergoneIVF: null, // true, false
    needDonorEggs: null, // true, false
    needDonorSperm: null, // true, false
    haveEmbryos: null, // true, false
    numberOfEmbryos: '',
    pgtATested: null, // true, false
    embryoDevelopmentDay: '', // day_3, day_5, day_6
    frozenAtClinic: '',
    clinicEmail: '',
    fertilityDoctorName: '',
    hivHepatitisSTD: '',
    
    // Step 5: Surrogate Preferences
    preferredSurrogateAgeRange: '',
    surrogateLocationPreference: '', // california, nationwide, specific_states, no_preference
    specificStates: '',
    acceptPreviousCSections: null, // true, false
    preferNoWorkDuringPregnancy: null, // true, false
    preferStableHome: null, // true, false
    preferFlexibleSchedule: null, // true, false
    haveDietPreference: null, // true, false
    dietPreference: '',
    communicationPreference: [], // Array of: weekly_updates, monthly_updates, major_medical_only, prefer_text, prefer_video, no_preference
    relationshipStyle: [], // Array of: close_relationship, moderate_relationship, minimal_contact, no_preference
    preferOBGYNGuidelines: null, // true, false
    
    // Step 6: More Surrogate Preferences
    preferAvoidHeavyLifting: null, // true, false
    preferAvoidTravel: null, // true, false
    comfortableLocalHospital: null, // true, false
    preferOpenToSelectiveReduction: null, // true, false
    preferOpenToTerminationMedical: null, // true, false
    preferPreviousSurrogacyExperience: '', // yes, no, no_preference
    preferStrongSupportSystem: null, // true, false
    preferMarried: '', // yes, no, no_preference
    preferStableIncome: null, // true, false
    preferComfortableWithAppointments: '', // yes, no, no_preference
    
    // Step 7: More Surrogate Preferences (continued)
    preferComfortableWithBirth: '', // yes, no, no_preference
    
    // Step 8: General Questions
    transferMoreThanOneEmbryo: null, // true, false
    attorneyName: '',
    attorneyEmail: '',
    haveTranslator: null, // true, false
    translatorName: '',
    translatorEmail: '',
    preparedForFailedTransfer: null, // true, false
    willingMultipleCycles: null, // true, false
    emotionallyPrepared: null, // true, false
    ableToHandleDelays: null, // true, false
    
    // Step 9: Letter to Surrogate
    letterToSurrogate: '',
    
    // Photos (up to 4)
    photos: [], // Array of photo URLs
    photoUrl: '', // Backward compatibility: single photo
  });

  // Draft storage helpers
  const getDraftKey = () => (user?.id ? `intended_parent_draft_${user.id}` : 'intended_parent_draft_guest');

  const loadDraft = async (userIdOverride = null) => {
    try {
      const uid = userIdOverride || user?.id;
      if (!uid) {
        return;
      }
      
      // 1) Try to load from Supabase
      const { data: latest, error } = await supabase
        .from('intended_parent_applications')
        .select('form_data, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.log('⚠️ Load draft from Supabase failed:', error.message);
      }

      if (latest && latest.form_data) {
        let parsed = {};
        try {
          parsed = JSON.parse(latest.form_data);
          // Ensure reasonForSurrogacy is an array (for backward compatibility)
          if (parsed.reasonForSurrogacy && !Array.isArray(parsed.reasonForSurrogacy)) {
            parsed.reasonForSurrogacy = parsed.reasonForSurrogacy ? [parsed.reasonForSurrogacy] : [];
          }
          // Ensure communicationPreference is an array (for backward compatibility)
          if (parsed.communicationPreference && !Array.isArray(parsed.communicationPreference)) {
            parsed.communicationPreference = parsed.communicationPreference ? [parsed.communicationPreference] : [];
          }
          // Ensure relationshipStyle is an array (for backward compatibility)
          if (parsed.relationshipStyle && !Array.isArray(parsed.relationshipStyle)) {
            parsed.relationshipStyle = parsed.relationshipStyle ? [parsed.relationshipStyle] : [];
          }
        } catch (e) {
          console.error('Error parsing form_data:', e);
        }
        
        setApplicationData((prev) => {
          const merged = normalizeParent1PhoneFields({ ...prev, ...parsed });
          // Don't let empty draft email wipe signup/profile autofill
          if (!String(merged.parent1Email || '').trim()) {
            merged.parent1Email = prev.parent1Email || user?.email || '';
          }
          return merged;
        });
        setTimeout(() => {
          setFormVersion(Date.now());
        }, 0);
        return;
      }

      // 2) Fallback to local draft
      const draftKey = `intended_parent_draft_${uid}`;
      const localDraft = await AsyncStorageLib.getItem(draftKey);
      if (localDraft) {
        try {
          const parsed = JSON.parse(localDraft);
          // Ensure reasonForSurrogacy is an array (for backward compatibility)
          if (parsed.reasonForSurrogacy && !Array.isArray(parsed.reasonForSurrogacy)) {
            parsed.reasonForSurrogacy = parsed.reasonForSurrogacy ? [parsed.reasonForSurrogacy] : [];
          }
          // Ensure communicationPreference is an array (for backward compatibility)
          if (parsed.communicationPreference && !Array.isArray(parsed.communicationPreference)) {
            parsed.communicationPreference = parsed.communicationPreference ? [parsed.communicationPreference] : [];
          }
          // Ensure relationshipStyle is an array (for backward compatibility)
          if (parsed.relationshipStyle && !Array.isArray(parsed.relationshipStyle)) {
            parsed.relationshipStyle = parsed.relationshipStyle ? [parsed.relationshipStyle] : [];
          }
          setApplicationData((prev) => {
            const merged = normalizeParent1PhoneFields({ ...prev, ...parsed });
            if (!String(merged.parent1Email || '').trim()) {
              merged.parent1Email = prev.parent1Email || user?.email || '';
            }
            return merged;
          });
          setTimeout(() => {
            setFormVersion(Date.now());
          }, 0);
        } catch (e) {
          console.error('Error parsing local draft:', e);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  // Load existing application data from database if in edit mode
  const loadExistingApplication = async () => {
    if (!editMode || !applicationId || !user?.id) {
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('intended_parent_applications')
        .select('*')
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading application:', error);
        Alert.alert('Error', 'Failed to load application data.');
        return;
      }

      if (data) {
        let formData = {};
        try {
          if (data.form_data) {
            formData = typeof data.form_data === 'string' ? JSON.parse(data.form_data) : data.form_data;
          }
        } catch (e) {
          console.error('Error parsing form_data:', e);
        }

        // Ensure arrays are properly formatted
        if (formData.reasonForSurrogacy && !Array.isArray(formData.reasonForSurrogacy)) {
          formData.reasonForSurrogacy = formData.reasonForSurrogacy ? [formData.reasonForSurrogacy] : [];
        }
        if (formData.communicationPreference && !Array.isArray(formData.communicationPreference)) {
          formData.communicationPreference = formData.communicationPreference ? [formData.communicationPreference] : [];
        }
        if (formData.relationshipStyle && !Array.isArray(formData.relationshipStyle)) {
          formData.relationshipStyle = formData.relationshipStyle ? [formData.relationshipStyle] : [];
        }

        setApplicationData(normalizeParent1PhoneFields(formData));
        // Set photos array if photos exist
        if (formData.photos && Array.isArray(formData.photos) && formData.photos.length > 0) {
          const photosArray = formData.photos.map((url, index) => ({
            uri: null,
            url: url,
            fileName: `Photo_${index + 1}.jpg`,
            fileSize: null,
            uploading: false,
          }));
          setPhotos(photosArray);
        } else if (formData.photoUrl) {
          // Backward compatibility: single photo
          const singlePhoto = [{
            uri: null,
            url: formData.photoUrl,
            fileName: 'Photo_1.jpg',
            fileSize: null,
            uploading: false,
          }];
          setPhotos(singlePhoto);
        }
      }
    } catch (error) {
      console.error('Error loading application:', error);
      Alert.alert('Error', 'Failed to load application data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing data if in edit mode or restore draft
  useEffect(() => {
    if (editMode && existingData) {
      // Ensure reasonForSurrogacy is an array (for backward compatibility)
      const dataToSet = { ...existingData };
      if (dataToSet.reasonForSurrogacy && !Array.isArray(dataToSet.reasonForSurrogacy)) {
        dataToSet.reasonForSurrogacy = dataToSet.reasonForSurrogacy ? [dataToSet.reasonForSurrogacy] : [];
      }
      // Ensure communicationPreference is an array (for backward compatibility)
      if (dataToSet.communicationPreference && !Array.isArray(dataToSet.communicationPreference)) {
        dataToSet.communicationPreference = dataToSet.communicationPreference ? [dataToSet.communicationPreference] : [];
      }
      // Ensure relationshipStyle is an array (for backward compatibility)
      if (dataToSet.relationshipStyle && !Array.isArray(dataToSet.relationshipStyle)) {
        dataToSet.relationshipStyle = dataToSet.relationshipStyle ? [dataToSet.relationshipStyle] : [];
      }
      setApplicationData(normalizeParent1PhoneFields(dataToSet));
      // Set photos array if photos exist
      if (dataToSet.photos && Array.isArray(dataToSet.photos) && dataToSet.photos.length > 0) {
        const photosArray = dataToSet.photos.map((url, index) => ({
          uri: null,
          url: url,
          fileName: `Photo_${index + 1}.jpg`,
          fileSize: null,
          uploading: false,
        }));
        setPhotos(photosArray);
      } else if (dataToSet.photoUrl) {
        // Backward compatibility: single photo
        const singlePhoto = [{
          uri: null,
          url: dataToSet.photoUrl,
          fileName: 'Photo_1.jpg',
          fileSize: null,
          uploading: false,
        }];
        setPhotos(singlePhoto);
      }
    } else if (editMode && applicationId && user) {
      // If in edit mode but no existingData provided, load from database
      loadExistingApplication();
    } else if (user) {
      // Pre-fill with user data if available — Phone Number is local-only (no country/area)
      const phoneParts = splitPhoneForParentForm(user.phone || user.user_metadata?.phone || '');
      const profileEmail = user.email || user.user_metadata?.email || '';
      setApplicationData((prev) =>
        normalizeParent1PhoneFields({
          ...prev,
          parent1Email: profileEmail || prev.parent1Email || '',
          parent1PhoneCountryCode: phoneParts.countryCode,
          parent1PhoneAreaCode: phoneParts.areaCode,
          parent1PhoneNumber: phoneParts.phoneNumber,
        })
      );
      // Load draft for authenticated users (will re-normalize if draft has full phone)
      loadDraft();
    }
  }, [editMode, existingData, applicationId, user]);

  // Save draft periodically
  useEffect(() => {
    if (user && formVersion > 0) {
      const draftKey = getDraftKey();
      AsyncStorageLib.setItem(draftKey, JSON.stringify(applicationData)).catch(err => {
        console.error('Error saving draft:', err);
      });
    }
  }, [applicationData, formVersion, user]);

  // Check if user needs to sign up
  useEffect(() => {
    if (!user && currentStep > 1) {
      const emailFromForm = String(applicationData.parent1Email || '').trim();
      if (emailFromForm) {
        setAuthEmail(emailFromForm);
      }
      setShowAuthPrompt(true);
    }
  }, [user, currentStep]);

  const updateField = (field, value) => {
    setApplicationData(prev => ({
      ...prev,
      [field]: value,
    }));
    setFormVersion(prev => prev + 1);
  };

  // Upload intended parent photo to Supabase Storage
  const beginPhotoUpload = (index) => {
    const token = (photoUploadTokenRef.current[index] || 0) + 1;
    photoUploadTokenRef.current[index] = token;
    return token;
  };

  const isPhotoUploadCurrent = (index, token) =>
    photoUploadTokenRef.current[index] === token;

  const syncPhotoUrls = (nextPhotos) => {
    const photoUrls = (nextPhotos || []).filter((p) => p && p.url).map((p) => p.url);
    updateField('photos', photoUrls.length > 0 ? photoUrls : []);
  };

  const uploadIntendedParentPhoto = async (uri, index, uploadToken) => {
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
      const fileName = `intended_parent_${authUser.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `intended-parent-photos/${fileName}`;
      
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

  // Format file size helper
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

  // Pick image from library (for a specific index)
  const pickPhoto = async (index) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need photo library permission to upload your photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
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
          const uploadResult = await uploadIntendedParentPhoto(selectedUri, index, uploadToken);
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
          Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
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
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  };

  // Take photo with camera (for a specific index)
  const takePhoto = async (index) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera permission to take your photo.');
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
          const uploadResult = await uploadIntendedParentPhoto(selectedUri, index, uploadToken);
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
          Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
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
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Show image picker options (for a specific index)
  const showPhotoPicker = (index) => {
    Alert.alert(
      'Upload Intended Parent Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => takePhoto(index) },
        { text: 'Choose from Library', onPress: () => pickPhoto(index) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const nextStep = () => {
    if (currentStep >= totalSteps) return;
    if (!validateStep(currentStep)) return;

    // Soft register: must create account before leaving step 1
    if (!user) {
      AsyncStorageLib.setItem(getDraftKey(), JSON.stringify(applicationData)).catch(() => {});
      const emailFromForm = String(applicationData.parent1Email || '').trim();
      if (emailFromForm) {
        setAuthEmail(emailFromForm);
      }
      setShowAuthPrompt(true);
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAuthPromptCancel = () => {
    setShowAuthPrompt(false);
    // Cannot skip registration — stay on / return to step 1 until signed up
    if (!user) {
      setCurrentStep(1);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!applicationData.familyStructure) {
          Alert.alert(t('common.requiredField'), t('parentApplication.familyStructure'));
          return false;
        }
        if (!applicationData.hearAboutUs) {
          Alert.alert(t('common.requiredField'), t('parentApplication.hearAboutUs'));
          return false;
        }
        if (!applicationData.parent1FirstName || !applicationData.parent1LastName) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Name'));
          return false;
        }
        if (!applicationData.parent1DateOfBirthMonth || !applicationData.parent1DateOfBirthDay || !applicationData.parent1DateOfBirthYear) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Dob'));
          return false;
        }
        if (!applicationData.parent1Gender) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Gender'));
          return false;
        }
        if (!applicationData.parent1BloodType) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1BloodType'));
          return false;
        }
        if (!applicationData.parent1Race?.trim()) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Race'));
          return false;
        }
        if (!applicationData.parent1Citizenship) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Citizenship'));
          return false;
        }
        if (!applicationData.parent1CountryState) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1CountryState'));
          return false;
        }
        if (!applicationData.parent1Occupation) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Occupation'));
          return false;
        }
        if (!applicationData.parent1Languages) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Languages'));
          return false;
        }
        if (!applicationData.parent1PhoneNumber) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Phone'));
          return false;
        }
        if (!applicationData.parent1Email) {
          Alert.alert(t('common.requiredField'), t('parentApplication.parent1Email'));
          return false;
        }
        if (!applicationData.parent1EmergencyContact) {
          Alert.alert(t('common.requiredField'), t('parentApplication.emergencyContact'));
          return false;
        }
        if (!applicationData.parent1AddressStreet || !applicationData.parent1AddressCity || !applicationData.parent1AddressState || !applicationData.parent1AddressZip) {
          Alert.alert(t('common.requiredField'), t('parentApplication.completeAddress'));
          return false;
        }
        break;
      case 2:
        // Only validate if family structure requires parent 2
        if (applicationData.familyStructure !== 'single_father' && applicationData.familyStructure !== 'single_mother') {
          if (!applicationData.parent2FirstName || !applicationData.parent2LastName) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Name'));
            return false;
          }
          if (!applicationData.parent2DateOfBirthMonth || !applicationData.parent2DateOfBirthDay || !applicationData.parent2DateOfBirthYear) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Dob'));
            return false;
          }
          if (!applicationData.parent2Gender) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Gender'));
            return false;
          }
          if (!applicationData.parent2BloodType) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2BloodType'));
            return false;
          }
          if (!applicationData.parent2Race?.trim()) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Race'));
            return false;
          }
          if (!applicationData.parent2Citizenship) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Citizenship'));
            return false;
          }
          if (!applicationData.parent2CountryState) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2CountryState'));
            return false;
          }
          if (!applicationData.parent2Occupation) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Occupation'));
            return false;
          }
          if (!applicationData.parent2Languages) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Languages'));
            return false;
          }
          if (!applicationData.parent2PhoneNumber) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Phone'));
            return false;
          }
          if (!applicationData.parent2Email) {
            Alert.alert(t('common.requiredField'), t('parentApplication.parent2Email'));
            return false;
          }
        }
        break;
      case 3:
        if (!applicationData.howLongTogether) {
          Alert.alert(t('common.requiredField'), t('parentApplication.howLongTogether'));
          return false;
        }
        if (applicationData.haveChildren === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.haveChildren'));
          return false;
        }
        if (applicationData.haveChildren && !applicationData.childrenDetails) {
          Alert.alert(t('common.requiredField'), t('parentApplication.childrenDetails'));
          return false;
        }
        break;
      case 4:
        if (!applicationData.reasonForSurrogacy || applicationData.reasonForSurrogacy.length === 0) {
          Alert.alert(t('common.requiredField'), t('parentApplication.reasonForSurrogacy'));
          return false;
        }
        if (applicationData.undergoneIVF === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.undergoneIVF'));
          return false;
        }
        if (applicationData.needDonorEggs === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.needDonorEggs'));
          return false;
        }
        if (applicationData.needDonorSperm === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.needDonorSperm'));
          return false;
        }
        if (applicationData.haveEmbryos === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.haveEmbryos'));
          return false;
        }
        if (applicationData.haveEmbryos && !applicationData.numberOfEmbryos) {
          Alert.alert(t('common.requiredField'), t('parentApplication.numberOfEmbryos'));
          return false;
        }
        if (applicationData.haveEmbryos && applicationData.pgtATested === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.pgtATested'));
          return false;
        }
        if (applicationData.haveEmbryos && !applicationData.embryoDevelopmentDay) {
          Alert.alert(t('common.requiredField'), t('parentApplication.embryoDevelopmentDay'));
          return false;
        }
        if (applicationData.haveEmbryos && !applicationData.frozenAtClinic) {
          Alert.alert(t('common.requiredField'), t('parentApplication.frozenAtClinic'));
          return false;
        }
        if (applicationData.haveEmbryos && !applicationData.clinicEmail) {
          Alert.alert(t('common.requiredField'), t('parentApplication.clinicEmail'));
          return false;
        }
        if (!applicationData.fertilityDoctorName) {
          Alert.alert(t('common.requiredField'), t('parentApplication.fertilityDoctorName'));
          return false;
        }
        if (!applicationData.hivHepatitisSTD) {
          Alert.alert(t('common.requiredField'), t('parentApplication.hivHepatitisSTD'));
          return false;
        }
        break;
      case 5:
        if (!applicationData.preferredSurrogateAgeRange) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferredSurrogateAgeRange'));
          return false;
        }
        if (!applicationData.surrogateLocationPreference) {
          Alert.alert(t('common.requiredField'), t('parentApplication.surrogateLocationPreference'));
          return false;
        }
        if (applicationData.surrogateLocationPreference === 'specific_states' && !applicationData.specificStates) {
          Alert.alert(t('common.requiredField'), t('parentApplication.specificStates'));
          return false;
        }
        if (applicationData.acceptPreviousCSections === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.acceptPreviousCSections'));
          return false;
        }
        if (applicationData.preferNoWorkDuringPregnancy === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferNoWorkDuringPregnancy'));
          return false;
        }
        if (applicationData.preferStableHome === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferStableHome'));
          return false;
        }
        if (applicationData.preferFlexibleSchedule === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferFlexibleSchedule'));
          return false;
        }
        if (applicationData.haveDietPreference === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.haveDietPreference'));
          return false;
        }
        if (applicationData.haveDietPreference && !applicationData.dietPreference) {
          Alert.alert(t('common.requiredField'), t('parentApplication.dietPreference'));
          return false;
        }
        if (!applicationData.communicationPreference || applicationData.communicationPreference.length === 0) {
          Alert.alert(t('common.requiredField'), t('parentApplication.communicationPreference'));
          return false;
        }
        if (!applicationData.relationshipStyle || applicationData.relationshipStyle.length === 0) {
          Alert.alert(t('common.requiredField'), t('parentApplication.relationshipStyle'));
          return false;
        }
        if (applicationData.preferOBGYNGuidelines === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferOBGYNGuidelines'));
          return false;
        }
        break;
      case 6:
        if (applicationData.preferAvoidHeavyLifting === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferAvoidHeavyLifting'));
          return false;
        }
        if (applicationData.preferAvoidTravel === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferAvoidTravel'));
          return false;
        }
        if (applicationData.comfortableLocalHospital === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.comfortableLocalHospital'));
          return false;
        }
        if (applicationData.preferOpenToSelectiveReduction === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferOpenToSelectiveReduction'));
          return false;
        }
        if (applicationData.preferOpenToTerminationMedical === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferOpenToTerminationMedical'));
          return false;
        }
        if (!applicationData.preferPreviousSurrogacyExperience) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferPreviousSurrogacyExperience'));
          return false;
        }
        if (applicationData.preferStrongSupportSystem === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferStrongSupportSystem'));
          return false;
        }
        if (!applicationData.preferMarried) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferMarried'));
          return false;
        }
        if (applicationData.preferStableIncome === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferStableIncome'));
          return false;
        }
        if (!applicationData.preferComfortableWithAppointments) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferComfortableWithAppointments'));
          return false;
        }
        if (!applicationData.preferComfortableWithBirth) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preferComfortableWithBirth'));
          return false;
        }
        break;
      case 7:
        // Step 7 validation (General Questions - previously Step 8)
        if (applicationData.transferMoreThanOneEmbryo === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.transferMoreThanOneEmbryo'));
          return false;
        }
        if (!applicationData.attorneyName) {
          Alert.alert(t('common.requiredField'), t('parentApplication.attorneyName'));
          return false;
        }
        if (!applicationData.attorneyEmail) {
          Alert.alert(t('common.requiredField'), t('parentApplication.attorneyEmail'));
          return false;
        }
        if (applicationData.haveTranslator === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.haveTranslator'));
          return false;
        }
        if (applicationData.haveTranslator && !applicationData.translatorName) {
          Alert.alert(t('common.requiredField'), t('parentApplication.translatorName'));
          return false;
        }
        if (applicationData.haveTranslator && !applicationData.translatorEmail) {
          Alert.alert(t('common.requiredField'), t('parentApplication.translatorEmail'));
          return false;
        }
        if (applicationData.preparedForFailedTransfer === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.preparedForFailedTransfer'));
          return false;
        }
        if (applicationData.willingMultipleCycles === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.willingMultipleCycles'));
          return false;
        }
        if (applicationData.emotionallyPrepared === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.emotionallyPrepared'));
          return false;
        }
        if (applicationData.ableToHandleDelays === null) {
          Alert.alert(t('common.requiredField'), t('parentApplication.ableToHandleDelays'));
          return false;
        }
        break;
      case 8:
        // Step 8 validation (Letter to Surrogate - previously Step 9)
        if (!applicationData.letterToSurrogate || applicationData.letterToSurrogate.trim() === '') {
          Alert.alert(t('common.requiredField'), t('parentApplication.letterToSurrogate'));
          return false;
        }
        if (!applicationData.photos || !Array.isArray(applicationData.photos) || applicationData.photos.length === 0) {
          Alert.alert(t('common.requiredField'), t('parentApplication.uploadParentPhoto'));
          return false;
        }
        break;
    }
    return true;
  };

  // Lazy sign-up for intended parents to save progress
  const handleLazySignup = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!authPasswordConfirm.trim()) {
      Alert.alert('Error', 'Please confirm your password');
      return;
    }
    if (authPassword !== authPasswordConfirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    // Mark intent to resume intended parent application flow
    console.log('🔖 pre-signup: setting resume_application_flow=intended_parent');
    await AsyncStorageLib.setItem('resume_application_flow', 'intended_parent');
    await AsyncStorageLib.setItem('resume_application_type', 'intended_parent');
    
    setAuthLoading(true);
    try {
      const role = 'parent';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            role,
            name: applicationData.parent1FirstName + ' ' + applicationData.parent1LastName,
            phone: formatParentPhoneForProfile(applicationData),
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
      if (!userId) {
        throw new Error('Registration failed. Please try again.');
      }

      // Wait for handle_new_user trigger to insert profile (same as AuthContext.register)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Upsert profile with form fields so My Info is populated after soft register
      let inviteCode = generateInviteCode();
      let attempts = 0;
      let profileUpserted = false;
      const signupIp = await getClientIp();
      while (attempts < 3) {
        const profilePayload = buildParentProfileFromApplication(applicationData, {
          userId,
          email: authEmail.trim(),
          inviteCode,
          signupIp,
        });
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' });

        if (!profileError) {
          profileUpserted = true;
          break;
        }

        if (profileError.code === '23505') {
          // duplicate invite_code, regenerate and retry
          inviteCode = generateInviteCode();
          attempts += 1;
          continue;
        }

        throw profileError;
      }

      if (!profileUpserted) {
        throw new Error('Failed to save profile. Please try again.');
      }

      // Refresh AuthContext so My Journey uses parent role immediately
      if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile();
      }

      // Save draft under the new user key
      await AsyncStorageLib.setItem(`intended_parent_draft_${userId}`, JSON.stringify(applicationData));
      
      // Mark that we should stay on intended parent application flow after auth switch
      console.log('🔖 setting resume_application_flow=intended_parent after lazy signup');
      await AsyncStorageLib.setItem('resume_application_flow', 'intended_parent');
      await AsyncStorageLib.setItem('resume_application_type', 'intended_parent');

      // Force state reapply immediately by reloading draft with the new user id
      await loadDraft(userId);
      const newVersion = Date.now();
      setFormVersion(newVersion);
      setCurrentStep(1);

      setShowAuthPrompt(false);
      Alert.alert('Success', 'Account created! Your progress has been saved. You can now continue with your application.');
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
      Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
      await AsyncStorageLib.removeItem('resume_application_flow');
      await AsyncStorageLib.removeItem('resume_application_type');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    setIsLoading(true);

    try {
      // Keep My Info (profiles) in sync with latest form answers
      const { error: profileSyncError } = await syncParentProfileToMyInfo(
        user.id,
        applicationData,
        applicationData.parent1Email || user.email
      );
      if (profileSyncError) {
        console.warn('Profile sync for My Info failed:', profileSyncError.message);
      } else if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile();
      }

      const clientIp = await getClientIp();
      const formDataToSave = JSON.stringify({
        ...applicationData,
        applicantIp: clientIp || undefined,
      });

      if (editMode && applicationId) {
        // Update existing application
        const updatePayload = {
          form_data: formDataToSave,
          status: 'pending',
          updated_at: new Date().toISOString(),
        };
        if (clientIp) updatePayload.ip_address = clientIp;
        const { data, error } = await supabase
          .from('intended_parent_applications')
          .update(updatePayload)
          .eq('id', applicationId)
          .select();

        if (error) throw error;

        let navigated = false;
        const navigateBack = () => {
          if (!navigated) {
            navigated = true;
            setTimeout(() => {
              try {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  // If can't go back and user is logged in, navigate to MainTabs (logged-in home)
                  if (user) {
                    navigation.navigate('MainTabs');
                  } else {
                    // If not logged in, try to navigate to LandingScreen
                    navigation.navigate('LandingScreen');
                  }
                }
              } catch (error) {
                // Try MainTabs first (for logged-in users), then LandingScreen as fallback
                try {
                  if (user) {
                    navigation.navigate('MainTabs');
                  } else {
                    navigation.navigate('LandingScreen');
                  }
                } catch (e) {
                  // Last resort: try to reset navigation stack
                  navigation.reset({
                    index: 0,
                    routes: [{ name: user ? 'MainTabs' : 'LandingScreen' }],
                  });
                }
              }
            }, 100);
          }
        };

        Alert.alert(
          'Success',
          'Application updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigateBack();
              },
            },
          ],
          { cancelable: false }
        );
        
        // Fallback: navigate after a delay if Alert callback doesn't execute
        setTimeout(() => {
          navigateBack();
        }, 2000);
      } else {
        // Create new application
        const insertPayload = {
          user_id: user.id,
          form_data: formDataToSave,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        };
        if (clientIp) insertPayload.ip_address = clientIp;
        const { data, error } = await supabase
          .from('intended_parent_applications')
          .insert(insertPayload)
          .select();

        if (error) throw error;

        // Save to local storage for history
        const application = {
          id: data[0].id,
          type: 'Intended Parent Application',
          status: 'pending',
          submittedDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0],
          description: `Intended Parent Application - ${applicationData.parent1FirstName} ${applicationData.parent1LastName}`,
          nextStep: 'Wait for initial review',
          data: applicationData,
        };

        try {
          const existingApplications = await AsyncStorageLib.getItem('user_applications');
          let applications = [];
          if (existingApplications) {
            applications = JSON.parse(existingApplications);
          }
          applications.unshift(application);
          await AsyncStorageLib.setItem('user_applications', JSON.stringify(applications));
        } catch (storageError) {
          console.error('Error saving application locally:', storageError);
        }

        let navigated = false;
        const navigateBack = () => {
          if (!navigated) {
            navigated = true;
            setTimeout(() => {
              try {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  // If can't go back and user is logged in, navigate to MainTabs (logged-in home)
                  if (user) {
                    navigation.navigate('MainTabs');
                  } else {
                    // If not logged in, try to navigate to LandingScreen
                    navigation.navigate('LandingScreen');
                  }
                }
              } catch (error) {
                // Try MainTabs first (for logged-in users), then LandingScreen as fallback
                try {
                  if (user) {
                    navigation.navigate('MainTabs');
                  } else {
                    navigation.navigate('LandingScreen');
                  }
                } catch (e) {
                  // Last resort: try to reset navigation stack
                  navigation.reset({
                    index: 0,
                    routes: [{ name: user ? 'MainTabs' : 'LandingScreen' }],
                  });
                }
              }
            }, 100);
          }
        };

        Alert.alert(
          tf('Success'),
          tf('Application submitted successfully! Our team will review and contact you within 5-7 business days.'),
          [
            {
              text: tf('OK'),
              onPress: () => {
                navigateBack();
              },
            },
          ],
          { cancelable: false }
        );
        
        // Fallback: navigate after a delay if Alert callback doesn't execute
        setTimeout(() => {
          navigateBack();
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      Alert.alert('Error', error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderNavigationButtons = () => (
    <View style={styles.navigationContainer}>
      {currentStep > 1 && (
        <TouchableOpacity style={styles.navButton} onPress={prevStep}>
          <Text style={styles.navButtonText}>{tf("Previous")}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.navButtonSpacer} />
      {currentStep < totalSteps ? (
        <TouchableOpacity style={[styles.navButton, styles.navButtonPrimary]} onPress={nextStep}>
          <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>{tf("Next")}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrimary, isLoading && styles.navButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
            {isLoading ? tf("Submitting...") : tf("Submit")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep8();
      case 8:
        return renderStep9();
      default:
        return null;
    }
  };

  const renderStep1 = () => {
    const handleInputFocus = (inputName) => {
      return () => {
        setTimeout(() => {
          if (step1InputRefs.current[inputName] && step1ScrollViewRef.current) {
            step1InputRefs.current[inputName].measureLayout(
              step1ScrollViewRef.current,
              (x, y) => {
                step1ScrollViewRef.current?.scrollTo({
                  y: y - 100,
                  animated: true,
                });
              },
              () => {
                // Fallback to scrollToEnd if measureLayout fails
                step1ScrollViewRef.current?.scrollToEnd({ animated: true });
              }
            );
          } else {
            step1ScrollViewRef.current?.scrollToEnd({ animated: true });
          }
        }, 100);
      };
    };
    
    return (
      <ScrollView 
        ref={step1ScrollViewRef}
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionTitle}>{tf("Family Structure")}</Text>
        <Text style={styles.label}>{tf("What is your family structure? *")}</Text>
        {['married', 'domestic_partners', 'same_sex_couple', 'single_father', 'single_mother'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.familyStructure === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('familyStructure', option)}
          >
            <Text style={styles.radioText}>
              {option === 'married' && tf("Married Heterosexual couple")}
              {option === 'domestic_partners' && tf("Domestic partners (unmarried couple living together)")}
              {option === 'same_sex_couple' && tf("Same-sex couple")}
              {option === 'single_father' && tf("Single Father")}
              {option === 'single_mother' && tf("Single Mother")}
            </Text>
            {applicationData.familyStructure === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>{tf("Basic Information")}</Text>
        
        <Text style={styles.label}>{tf("How did you hear about us? *")}</Text>
        {['google_search', 'youtube', 'online_resources', 'facebook', 'friend', 'other_agency', 'ai', 'clinic_referral'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.hearAboutUs === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('hearAboutUs', option)}
          >
            <Text style={styles.radioText}>
              {option === 'google_search' && tf("Google Search")}
              {option === 'youtube' && tf("Youtube")}
              {option === 'online_resources' && tf("Online resources, etc")}
              {option === 'facebook' && tf("Facebook, X")}
              {option === 'friend' && tf("Friend")}
              {option === 'other_agency' && tf("Other Agency")}
              {option === 'ai' && tf("AI")}
              {option === 'clinic_referral' && tf("Clinic Referral")}
            </Text>
            {applicationData.hearAboutUs === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>{tf("Intended Parent 1 Name *")}</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder={tf("First Name")}
            value={applicationData.parent1FirstName}
            onChangeText={(text) => updateField('parent1FirstName', text)}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 8 }]}
            placeholder={tf("Last Name")}
            value={applicationData.parent1LastName}
            onChangeText={(text) => updateField('parent1LastName', text)}
          />
        </View>

        <Text style={styles.label}>{tf("Date of Birth *")}</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 4 }]}
            placeholder={tf("Month")}
            value={applicationData.parent1DateOfBirthMonth}
            onChangeText={(text) => updateField('parent1DateOfBirthMonth', text)}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginHorizontal: 4 }]}
            placeholder={tf("Day")}
            value={applicationData.parent1DateOfBirthDay}
            onChangeText={(text) => updateField('parent1DateOfBirthDay', text)}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 4 }]}
            placeholder={tf("Year")}
            value={applicationData.parent1DateOfBirthYear}
            onChangeText={(text) => updateField('parent1DateOfBirthYear', text)}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.label}>{tf("Gender *")}</Text>
        {['male', 'female'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.parent1Gender === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('parent1Gender', option)}
          >
            <Text style={styles.radioText}>{option === 'male' ? tf("Male") : tf("Female")}</Text>
            {applicationData.parent1Gender === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Blood Type *")}</Text>
        <TextInput
          ref={(ref) => { step1InputRefs.current.bloodType = ref; }}
          style={styles.input}
          placeholder={tf("Enter blood type")}
          value={applicationData.parent1BloodType}
          onChangeText={(text) => updateField('parent1BloodType', text)}
          onFocus={handleInputFocus('bloodType')}
        />

        <Text style={styles.label}>{tf("Race/Ethnic Background *")}</Text>
        <TextInput
          ref={(ref) => { step1InputRefs.current.race = ref; }}
          style={styles.input}
          placeholder={tf("Enter race/ethnic background")}
          value={applicationData.parent1Race}
          onChangeText={(text) => updateField('parent1Race', text)}
          onFocus={handleInputFocus('race')}
        />

        <Text style={styles.label}>{tf("Citizenship *")}</Text>
        <TextInput
          ref={(ref) => { step1InputRefs.current.citizenship = ref; }}
          style={styles.input}
          placeholder={tf("Enter citizenship")}
          value={applicationData.parent1Citizenship}
          onChangeText={(text) => updateField('parent1Citizenship', text)}
          onFocus={handleInputFocus('citizenship')}
        />

        <Text style={styles.label}>{tf("Country/State of Residence *")}</Text>
        <TextInput
          ref={(ref) => { step1InputRefs.current.countryState = ref; }}
          style={styles.input}
          placeholder={tf("Enter country/state")}
          value={applicationData.parent1CountryState}
          onChangeText={(text) => updateField('parent1CountryState', text)}
          onFocus={handleInputFocus('countryState')}
        />

        <Text style={styles.label}>{tf("Occupation: *")}</Text>
        <TextInput
          ref={(ref) => { step1InputRefs.current.occupation = ref; }}
          style={styles.input}
          placeholder={tf("Enter occupation")}
          value={applicationData.parent1Occupation}
          onChangeText={(text) => updateField('parent1Occupation', text)}
          onFocus={handleInputFocus('occupation')}
        />

        <Text style={styles.label}>{tf("What languages do you speak? *")}</Text>
        <TextInput
          ref={(ref) => { step1InputRefs.current.languages = ref; }}
          style={styles.input}
          placeholder={tf("Enter languages")}
          value={applicationData.parent1Languages}
          onChangeText={(text) => updateField('parent1Languages', text)}
          onFocus={handleInputFocus('languages')}
        />

        <Text style={styles.label}>{tf("Phone Number *")}</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 4 }]}
            placeholder={tf("Country Code")}
            value={applicationData.parent1PhoneCountryCode}
            onChangeText={(text) => updateField('parent1PhoneCountryCode', text)}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginHorizontal: 4 }]}
            placeholder={tf("Area Code")}
            value={applicationData.parent1PhoneAreaCode}
            onChangeText={(text) => updateField('parent1PhoneAreaCode', text)}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 4 }]}
            placeholder={tf("Phone Number")}
            value={applicationData.parent1PhoneNumber}
            onChangeText={(text) => updateField('parent1PhoneNumber', text)}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>{tf("Email *")}</Text>
        <TextInput
          ref={(ref) => { step1InputRefs.current.email = ref; }}
          style={styles.input}
          placeholder={tf("Enter email address")}
          value={applicationData.parent1Email}
          onChangeText={(text) => updateField('parent1Email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
          onFocus={handleInputFocus('email')}
        />

        <Text style={styles.label}>{tf("Person other than spouse to be notified in case of emergency: *")}</Text>
        <TextInput
          ref={(ref) => { step1InputRefs.current.emergencyContact = ref; }}
          style={styles.input}
          placeholder={tf("Enter emergency contact name")}
          value={applicationData.parent1EmergencyContact}
          onChangeText={(text) => updateField('parent1EmergencyContact', text)}
          onFocus={handleInputFocus('emergencyContact')}
        />

        <Text style={styles.label}>{tf("Address *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Street Address")}
          value={applicationData.parent1AddressStreet}
          onChangeText={(text) => updateField('parent1AddressStreet', text)}
        />
        <TextInput
          style={styles.input}
          placeholder={tf("Street Address Line 2")}
          value={applicationData.parent1AddressStreet2}
          onChangeText={(text) => updateField('parent1AddressStreet2', text)}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder={tf("City")}
            value={applicationData.parent1AddressCity}
            onChangeText={(text) => updateField('parent1AddressCity', text)}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 8 }]}
            placeholder={tf("State / Province")}
            value={applicationData.parent1AddressState}
            onChangeText={(text) => updateField('parent1AddressState', text)}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder={tf("Postal / Zip Code")}
          value={applicationData.parent1AddressZip}
          onChangeText={(text) => updateField('parent1AddressZip', text)}
        />
        {renderNavigationButtons()}
      </ScrollView>
    );
  };

  const renderStep2 = () => {
    // Only show if not single parent
    if (applicationData.familyStructure === 'single_father' || applicationData.familyStructure === 'single_mother') {
      return (
        <ScrollView
          style={styles.stepContent}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={styles.infoText}>{tf("This step is not applicable for single parents.")}</Text>
          {renderNavigationButtons()}
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionTitle}>{tf("Intended Parent 2 Name *")}</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder={tf("First Name")}
            value={applicationData.parent2FirstName}
            onChangeText={(text) => updateField('parent2FirstName', text)}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 8 }]}
            placeholder={tf("Last Name")}
            value={applicationData.parent2LastName}
            onChangeText={(text) => updateField('parent2LastName', text)}
          />
        </View>

        <Text style={styles.label}>{tf("Date of Birth *")}</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 4 }]}
            placeholder={tf("Month")}
            value={applicationData.parent2DateOfBirthMonth}
            onChangeText={(text) => updateField('parent2DateOfBirthMonth', text)}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginHorizontal: 4 }]}
            placeholder={tf("Day")}
            value={applicationData.parent2DateOfBirthDay}
            onChangeText={(text) => updateField('parent2DateOfBirthDay', text)}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 4 }]}
            placeholder={tf("Year")}
            value={applicationData.parent2DateOfBirthYear}
            onChangeText={(text) => updateField('parent2DateOfBirthYear', text)}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.label}>{tf("Gender *")}</Text>
        {['male', 'female'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.parent2Gender === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('parent2Gender', option)}
          >
            <Text style={styles.radioText}>{option === 'male' ? tf("Male") : tf("Female")}</Text>
            {applicationData.parent2Gender === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Blood Type *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter blood type")}
          value={applicationData.parent2BloodType}
          onChangeText={(text) => updateField('parent2BloodType', text)}
        />

        <Text style={styles.label}>{tf("Race/Ethnic Background *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter race/ethnic background")}
          value={applicationData.parent2Race}
          onChangeText={(text) => updateField('parent2Race', text)}
        />

        <Text style={styles.label}>{tf("Citizenship *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter citizenship")}
          value={applicationData.parent2Citizenship}
          onChangeText={(text) => updateField('parent2Citizenship', text)}
        />

        <Text style={styles.label}>{tf("Country/State of Residence *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter country/state")}
          value={applicationData.parent2CountryState}
          onChangeText={(text) => updateField('parent2CountryState', text)}
        />

        <Text style={styles.label}>{tf("Occupation: *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter occupation")}
          value={applicationData.parent2Occupation}
          onChangeText={(text) => updateField('parent2Occupation', text)}
        />

        <Text style={styles.label}>{tf("What languages do you speak? *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter languages")}
          value={applicationData.parent2Languages}
          onChangeText={(text) => updateField('parent2Languages', text)}
        />

        <Text style={styles.label}>{tf("Phone Number *")}</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 4 }]}
            placeholder={tf("Country Code")}
            value={applicationData.parent2PhoneCountryCode}
            onChangeText={(text) => updateField('parent2PhoneCountryCode', text)}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginHorizontal: 4 }]}
            placeholder={tf("Area Code")}
            value={applicationData.parent2PhoneAreaCode}
            onChangeText={(text) => updateField('parent2PhoneAreaCode', text)}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 4 }]}
            placeholder={tf("Phone Number")}
            value={applicationData.parent2PhoneNumber}
            onChangeText={(text) => updateField('parent2PhoneNumber', text)}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>{tf("Email *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter email address")}
          value={applicationData.parent2Email}
          onChangeText={(text) => updateField('parent2Email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {renderNavigationButtons()}
      </ScrollView>
    );
  };

  const renderStep3 = () => {
    return (
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionTitle}>{tf("Family Background")}</Text>
        
        <Text style={styles.label}>{tf("How long have you been together? *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter duration (e.g., 5 years)")}
          value={applicationData.howLongTogether}
          onChangeText={(text) => updateField('howLongTogether', text)}
        />

        <Text style={styles.label}>{tf("Do you have any children? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.haveChildren === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('haveChildren', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.haveChildren === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        {applicationData.haveChildren && (
          <>
            <Text style={styles.label}>{tf("If yes, please list ages, gender and whether they were born via IVF, surrogacy, or natural birth. *")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={tf("Enter children details")}
              value={applicationData.childrenDetails}
              onChangeText={(text) => updateField('childrenDetails', text)}
              multiline
              numberOfLines={4}
            />
          </>
        )}
        {renderNavigationButtons()}
      </ScrollView>
    );
  };

  const renderStep4 = () => {
    return (
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionTitle}>{tf("Medical & Fertility History")}</Text>
        
        <Text style={styles.label}>{tf("Reason for pursuing surrogacy *")}</Text>
        {['infertility_diagnosis', 'medical_condition', 'same_sex_couple', 'single_parent'].map((option) => {
          const isSelected = Array.isArray(applicationData.reasonForSurrogacy) && applicationData.reasonForSurrogacy.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                isSelected && styles.radioOptionSelected,
              ]}
              onPress={() => {
                const currentReasons = Array.isArray(applicationData.reasonForSurrogacy) ? applicationData.reasonForSurrogacy : [];
                if (isSelected) {
                  // Remove from selection
                  updateField('reasonForSurrogacy', currentReasons.filter(r => r !== option));
                } else {
                  // Add to selection
                  updateField('reasonForSurrogacy', [...currentReasons, option]);
                }
              }}
            >
              <Text style={styles.radioText}>
                {option === 'infertility_diagnosis' && tf("Infertility diagnosis")}
                {option === 'medical_condition' && tf("Medical condition")}
                {option === 'same_sex_couple' && tf("Same-sex couple")}
                {option === 'single_parent' && tf("Single parent")}
              </Text>
              {isSelected && <Text style={styles.radioCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.label}>{tf("Have you undergone IVF to get pregnant by yourself before? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.undergoneIVF === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('undergoneIVF', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.undergoneIVF === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Do you need donor eggs? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.needDonorEggs === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('needDonorEggs', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.needDonorEggs === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Do you need donor sperm? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.needDonorSperm === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('needDonorSperm', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.needDonorSperm === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Do you currently have embryos? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.haveEmbryos === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('haveEmbryos', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.haveEmbryos === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        {applicationData.haveEmbryos && (
          <>
            <Text style={styles.label}>{tf("Number of embryos *")}</Text>
            <TextInput
              style={styles.input}
              placeholder={tf("Enter number of embryos")}
              value={applicationData.numberOfEmbryos}
              onChangeText={(text) => updateField('numberOfEmbryos', text)}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{tf("PGT-A tested? *")}</Text>
            {[true, false].map((option) => (
              <TouchableOpacity
                key={String(option)}
                style={[
                  styles.radioOption,
                  applicationData.pgtATested === option && styles.radioOptionSelected,
                ]}
                onPress={() => updateField('pgtATested', option)}
              >
                <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
                {applicationData.pgtATested === option && <Text style={styles.radioCheck}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>{tf("Please indicate the development day of your embryos: *")}</Text>
            {['day_3', 'day_5', 'day_6'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radioOption,
                  applicationData.embryoDevelopmentDay === option && styles.radioOptionSelected,
                ]}
                onPress={() => updateField('embryoDevelopmentDay', option)}
              >
                <Text style={styles.radioText}>
                  {option === 'day_3' && tf("Day 3")}
                  {option === 'day_5' && tf("Day 5 (blastocyst)")}
                  {option === 'day_6' && tf("Day 6 (blastocyst)")}
                </Text>
                {applicationData.embryoDevelopmentDay === option && <Text style={styles.radioCheck}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>{tf("Frozen at which clinic? *")}</Text>
            <TextInput
              style={styles.input}
              placeholder={tf("Enter clinic name")}
              value={applicationData.frozenAtClinic}
              onChangeText={(text) => updateField('frozenAtClinic', text)}
            />

            <Text style={styles.label}>{tf("Please list an email contact for your fertility clinic. *")}</Text>
            <TextInput
              style={styles.input}
              placeholder={tf("Enter clinic email")}
              value={applicationData.clinicEmail}
              onChangeText={(text) => updateField('clinicEmail', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        )}

        <Text style={styles.label}>{tf("What is the name of the fertility doctor you are working with? *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter doctor name")}
          value={applicationData.fertilityDoctorName}
          onChangeText={(text) => updateField('fertilityDoctorName', text)}
        />

        <Text style={styles.label}>{tf("Are you or have you ever been positive for any of the following things? If yes please list what specifically. HIV, Hepatitis A,B,or C or any STDs *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={tf("Enter details if applicable")}
          value={applicationData.hivHepatitisSTD}
          onChangeText={(text) => updateField('hivHepatitisSTD', text)}
          multiline
          numberOfLines={4}
        />
        {renderNavigationButtons()}
      </ScrollView>
    );
  };

  const renderStep5 = () => {
    return (
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionTitle}>{tf("Surrogate Preferences")}</Text>
        
        <Text style={styles.label}>{tf("What is your preferred surrogate age range? *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter age range (e.g., 25-35)")}
          value={applicationData.preferredSurrogateAgeRange}
          onChangeText={(text) => updateField('preferredSurrogateAgeRange', text)}
        />

        <Text style={styles.label}>{tf("Surrogate location preference *")}</Text>
        {['california', 'nationwide', 'specific_states', 'no_preference'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.surrogateLocationPreference === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('surrogateLocationPreference', option)}
          >
            <Text style={styles.radioText}>
              {option === 'california' && tf("California")}
              {option === 'nationwide' && tf("Nationwide")}
              {option === 'specific_states' && tf("Specific states")}
              {option === 'no_preference' && tf("No preference")}
            </Text>
            {applicationData.surrogateLocationPreference === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        {applicationData.surrogateLocationPreference === 'specific_states' && (
          <>
            <Text style={styles.label}>{tf("Please list which state *")}</Text>
            <TextInput
              style={styles.input}
              placeholder={tf("Enter state name(s)")}
              value={applicationData.specificStates}
              onChangeText={(text) => updateField('specificStates', text)}
            />
          </>
        )}

        <Text style={styles.label}>{tf("Accept a surrogate with previous C-sections? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.acceptPreviousCSections === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('acceptPreviousCSections', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.acceptPreviousCSections === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer a surrogate who does not work during pregnancy? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferNoWorkDuringPregnancy === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferNoWorkDuringPregnancy', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferNoWorkDuringPregnancy === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate with stable home environment? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferStableHome === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferStableHome', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferStableHome === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate with flexible schedule? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferFlexibleSchedule === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferFlexibleSchedule', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferFlexibleSchedule === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Do you have diet preference during pregnancy? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.haveDietPreference === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('haveDietPreference', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.haveDietPreference === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        {applicationData.haveDietPreference && (
          <>
            <Text style={styles.label}>{tf("If yes, what is your preference *")}</Text>
            <TextInput
              style={styles.input}
              placeholder={tf("Enter diet preference")}
              value={applicationData.dietPreference}
              onChangeText={(text) => updateField('dietPreference', text)}
            />
          </>
        )}

        <Text style={styles.label}>{tf("Communication Preferences *")}</Text>
        {['weekly_updates', 'monthly_updates', 'major_medical_only', 'prefer_text', 'prefer_video', 'no_preference'].map((option) => {
          const isSelected = Array.isArray(applicationData.communicationPreference) && applicationData.communicationPreference.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                isSelected && styles.radioOptionSelected,
              ]}
              onPress={() => {
                const currentPreferences = Array.isArray(applicationData.communicationPreference) ? applicationData.communicationPreference : [];
                if (isSelected) {
                  // Remove from selection
                  updateField('communicationPreference', currentPreferences.filter(p => p !== option));
                } else {
                  // Add to selection
                  updateField('communicationPreference', [...currentPreferences, option]);
                }
              }}
            >
              <Text style={styles.radioText}>
                {option === 'weekly_updates' && tf("Weekly updates")}
                {option === 'monthly_updates' && tf("Monthly updates")}
                {option === 'major_medical_only' && tf("Only major medical updates")}
                {option === 'prefer_text' && tf("Prefer text messages")}
                {option === 'prefer_video' && tf("Prefer video calls")}
                {option === 'no_preference' && tf("No preference")}
              </Text>
              {isSelected && <Text style={styles.radioCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.label}>{tf("Relationship Style With Surrogate *")}</Text>
        {['close_relationship', 'moderate_relationship', 'minimal_contact', 'no_preference'].map((option) => {
          const isSelected = Array.isArray(applicationData.relationshipStyle) && applicationData.relationshipStyle.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                isSelected && styles.radioOptionSelected,
              ]}
              onPress={() => {
                const currentStyles = Array.isArray(applicationData.relationshipStyle) ? applicationData.relationshipStyle : [];
                if (isSelected) {
                  // Remove from selection
                  updateField('relationshipStyle', currentStyles.filter(s => s !== option));
                } else {
                  // Add to selection
                  updateField('relationshipStyle', [...currentStyles, option]);
                }
              }}
            >
              <Text style={styles.radioText}>
                {option === 'close_relationship' && tf("Close relationship (frequent communication)")}
                {option === 'moderate_relationship' && tf("Moderate relationship (regular updates)")}
                {option === 'minimal_contact' && tf("Prefer minimal contact")}
                {option === 'no_preference' && tf("No preference")}
              </Text>
              {isSelected && <Text style={styles.radioCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.label}>{tf("Prefer surrogate to follow specific OB/GYN guidelines? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferOBGYNGuidelines === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferOBGYNGuidelines', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferOBGYNGuidelines === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
        {renderNavigationButtons()}
      </ScrollView>
    );
  };

  const renderStep6 = () => {
    return (
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionTitle}>{tf("Surrogate Preferences (Continued)")}</Text>
        
        <Text style={styles.label}>{tf("Prefer surrogate to avoid heavy lifting? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferAvoidHeavyLifting === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferAvoidHeavyLifting', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferAvoidHeavyLifting === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate to avoid travel during pregnancy? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferAvoidTravel === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferAvoidTravel', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferAvoidTravel === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Comfortable with surrogate delivering in her local hospital? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.comfortableLocalHospital === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('comfortableLocalHospital', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.comfortableLocalHospital === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate who is open to selective reduction? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferOpenToSelectiveReduction === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferOpenToSelectiveReduction', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferOpenToSelectiveReduction === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate with previous surrogacy experience? *")}</Text>
        {['yes', 'no', 'no_preference'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.preferPreviousSurrogacyExperience === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferPreviousSurrogacyExperience', option)}
          >
            <Text style={styles.radioText}>
              {option === 'yes' && tf("Yes")}
              {option === 'no' && tf("No")}
              {option === 'no_preference' && tf("No preference")}
            </Text>
            {applicationData.preferPreviousSurrogacyExperience === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate with strong support system? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferStrongSupportSystem === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferStrongSupportSystem', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferStrongSupportSystem === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate who is married? *")}</Text>
        {['yes', 'no', 'no_preference'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.preferMarried === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferMarried', option)}
          >
            <Text style={styles.radioText}>
              {option === 'yes' && tf("Yes")}
              {option === 'no' && tf("No")}
              {option === 'no_preference' && tf("No preference")}
            </Text>
            {applicationData.preferMarried === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate with stable income? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferStableIncome === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferStableIncome', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferStableIncome === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate who is open to termination for medical reasons? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preferOpenToTerminationMedical === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferOpenToTerminationMedical', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preferOpenToTerminationMedical === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate who is comfortable with intended parents attending appointments? *")}</Text>
        {['yes', 'no', 'no_preference'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.preferComfortableWithAppointments === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferComfortableWithAppointments', option)}
          >
            <Text style={styles.radioText}>
              {option === 'yes' && tf("Yes")}
              {option === 'no' && tf("No")}
              {option === 'no_preference' && tf("No preference")}
            </Text>
            {applicationData.preferComfortableWithAppointments === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Prefer surrogate who is comfortable with intended parents being present at birth? *")}</Text>
        {['yes', 'no', 'no_preference'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.radioOption,
              applicationData.preferComfortableWithBirth === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preferComfortableWithBirth', option)}
          >
            <Text style={styles.radioText}>
              {option === 'yes' && tf("Yes")}
              {option === 'no' && tf("No")}
              {option === 'no_preference' && tf("No preference")}
            </Text>
            {applicationData.preferComfortableWithBirth === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
        {renderNavigationButtons()}
      </ScrollView>
    );
  };

  const renderStep8 = () => {
    return (
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionTitle}>{tf("General Questions")}</Text>
        
        <Text style={styles.label}>{tf("Will you transfer more than one embryo? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.transferMoreThanOneEmbryo === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('transferMoreThanOneEmbryo', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.transferMoreThanOneEmbryo === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Please list the attorney you are working with *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter attorney name")}
          value={applicationData.attorneyName}
          onChangeText={(text) => updateField('attorneyName', text)}
        />

        <Text style={styles.label}>{tf("Please list the Attorney's Email address below. *")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tf("Enter attorney email")}
          value={applicationData.attorneyEmail}
          onChangeText={(text) => updateField('attorneyEmail', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>{tf("Do you have a translator? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.haveTranslator === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('haveTranslator', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.haveTranslator === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        {applicationData.haveTranslator && (
          <>
            <Text style={styles.label}>{tf("Please list the name of your translator *")}</Text>
            <TextInput
              style={styles.input}
              placeholder={tf("Enter translator name")}
              value={applicationData.translatorName}
              onChangeText={(text) => updateField('translatorName', text)}
            />

            <Text style={styles.label}>{tf("Please provide translator email *")}</Text>
            <TextInput
              style={styles.input}
              placeholder={tf("Enter translator email")}
              value={applicationData.translatorEmail}
              onChangeText={(text) => updateField('translatorEmail', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        )}

        <Text style={styles.label}>{tf("Are you prepared for the possibility of a failed embryo transfer? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.preparedForFailedTransfer === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('preparedForFailedTransfer', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.preparedForFailedTransfer === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Are you willing to attempt multiple cycles if needed? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.willingMultipleCycles === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('willingMultipleCycles', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.willingMultipleCycles === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Are you emotionally prepared for the full surrogacy journey? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.emotionallyPrepared === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('emotionallyPrepared', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.emotionallyPrepared === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>{tf("Are you able to handle potential delays or medical risks? *")}</Text>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.radioOption,
              applicationData.ableToHandleDelays === option && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('ableToHandleDelays', option)}
          >
            <Text style={styles.radioText}>{option ? tf("YES") : tf("NO")}</Text>
            {applicationData.ableToHandleDelays === option && <Text style={styles.radioCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
        {renderNavigationButtons()}
      </ScrollView>
    );
  };

  const renderStep9 = () => {
    return (
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.sectionTitle}>{tf("Letter to Surrogate")}</Text>
        
        <Text style={styles.label}>{tf("Please take this opportunity to write a letter to the surrogate who will be reviewing your profile *")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={tf("Write your letter here")}
          value={applicationData.letterToSurrogate}
          onChangeText={(text) => updateField('letterToSurrogate', text)}
          multiline
          numberOfLines={15}
        />

        {/* Intended Parent Photos Upload (4 photos) */}
        <Text style={[styles.label, { marginTop: 30 }]}>{tf("Intended Parent Photos (up to 4) *")}</Text>
        <View style={styles.photosContainer}>
          {[0, 1, 2, 3].map((index) => {
            const photo = photos[index];
            const photoUrl = photo?.url || (applicationData.photos && applicationData.photos[index]);
            
            return (
              <View key={index} style={styles.photoItemContainer}>
                {photoUrl || photo?.uri ? (
                  <View style={styles.photoItem}>
                    <Image
                      source={{ uri: photo?.uri || photoUrl }}
                      style={styles.photoThumbnail}
                      onError={(error) => {
                        console.error('Image load error:', error);
                      }}
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
                          {photo?.fileName || `Photo_${index + 1}.jpg`}
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
        {renderNavigationButtons()}
      </ScrollView>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Landing')}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={16} color="#2A7BF6" />
            <Text style={styles.backButtonText}>{tf("Back to Home")}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tf("Intended Parent Application")}</Text>
          <Text style={styles.headerSubtitle}>{tf("Tell us about yourself")}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{tf('Step')} {currentStep} {language === 'zh' ? ' / ' : ' of '} {totalSteps}</Text>
        </View>

        {/* Step Content (Next/Previous live inside each step ScrollView) */}
        {renderStepContent()}

        {/* Auth Prompt Modal */}
        {showAuthPrompt && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{tf("Sign Up Required")}</Text>
              <Text style={styles.modalText}>
                Please create an account to continue with your application.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={tf("Email")}
                value={authEmail}
                onChangeText={setAuthEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.modalPasswordRow}>
                <TextInput
                  style={styles.modalPasswordInput}
                  placeholder={tf("Password")}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry={!showAuthPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.modalEyeButton}
                  onPress={() => setShowAuthPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showAuthPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showAuthPassword ? 'eye' : 'eye-off'} size={20} color="#6E7191" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalPasswordRow}>
                <TextInput
                  style={styles.modalPasswordInput}
                  placeholder={tf("Confirm Password")}
                  value={authPasswordConfirm}
                  onChangeText={setAuthPasswordConfirm}
                  secureTextEntry={!showAuthPasswordConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.modalEyeButton}
                  onPress={() => setShowAuthPasswordConfirm((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showAuthPasswordConfirm ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showAuthPasswordConfirm ? 'eye' : 'eye-off'} size={20} color="#6E7191" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={handleAuthPromptCancel}
                >
                  <Text style={styles.modalButtonText}>{tf("Cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleLazySignup}
                  disabled={authLoading}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    {authLoading ? tf("Creating...") : tf("Sign Up")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1D1E',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2A7BF6',
  },
  progressText: {
    fontSize: 12,
    color: '#6E7191',
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D1E',
    marginTop: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D1E',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1D1E',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  radioOptionSelected: {
    borderColor: '#2A7BF6',
    backgroundColor: '#E3F2FD',
  },
  radioText: {
    fontSize: 16,
    color: '#1A1D1E',
    flex: 1,
  },
  radioCheck: {
    fontSize: 18,
    color: '#2A7BF6',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 16,
    color: '#6E7191',
    textAlign: 'center',
    marginTop: 40,
  },
  navigationContainer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  navButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#2A7BF6',
  },
  navButtonDisabled: {
    opacity: 0.6,
  },
  navButtonSpacer: {
    width: 12,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D1E',
  },
  navButtonTextPrimary: {
    color: '#fff',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#6E7191',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginBottom: 12,
    paddingRight: 4,
  },
  modalPasswordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  modalEyeButton: {
    padding: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F8F9FA',
    marginRight: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#2A7BF6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D1E',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
  // Photo upload styles
  photoContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  photoUploadButton: {
    borderWidth: 2,
    borderColor: '#2A7BF6',
    borderStyle: 'dashed',
    borderRadius: 8,
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
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
