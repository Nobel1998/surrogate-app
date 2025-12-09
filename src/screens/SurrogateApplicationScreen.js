import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

export default function SurrogateApplicationScreen({ navigation, route }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [applicationData, setApplicationData] = useState({
    // Step 1: Personal Information
    fullName: user?.name || '',
    age: user?.user_metadata?.age || '',
    dateOfBirth: user?.user_metadata?.date_of_birth || user?.dateOfBirth || '',
    phoneNumber: user?.phone || '',
    email: user?.email || '',
    location: user?.address || '',
    hearAboutUs: user?.user_metadata?.hear_about_us || '',
    race: user?.user_metadata?.race || user?.race || '',
    referralCode: user?.user_metadata?.referred_by || '',
    
    // Step 2: Medical Information
    previousPregnancies: '',
    previousSurrogacy: false,
    pregnancyComplications: '',
    currentMedications: '',
    healthConditions: '',
    bmi: '',
    
    // Step 3: Lifestyle Information
    smokingStatus: '',
    alcoholUsage: '',
    exerciseRoutine: '',
    employmentStatus: '',
    supportSystem: '',
    
    // Step 4: Legal & Background
    criminalBackground: false,
    legalIssues: '',
    insuranceCoverage: '',
    financialStability: '',
    
    // Step 5: Preferences & Additional
    compensationExpectations: '',
    timelineAvailability: '',
    travelWillingness: false,
    specialPreferences: '',
    additionalComments: '',
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
          Alert.alert('Error', 'Please enter your full name');
          return false;
        }
        if (!applicationData.age || parseInt(applicationData.age) < 21 || parseInt(applicationData.age) > 40) {
          Alert.alert('Error', 'Age must be between 21 and 40');
          return false;
        }
        if (!applicationData.dateOfBirth.trim()) {
          Alert.alert('Error', 'Please enter your date of birth');
          return false;
        }
        
        // Validate date of birth format and calculate age from it
        const calculatedAge = calculateAgeFromDateOfBirth(applicationData.dateOfBirth);
        if (calculatedAge === null) {
          Alert.alert('Error', 'Please enter a valid date of birth in MM/DD/YYYY format');
          return false;
        }
        
        // Check if calculated age matches entered age (allow 1 year difference for rounding)
        const enteredAge = parseInt(applicationData.age);
        if (Math.abs(calculatedAge - enteredAge) > 1) {
          Alert.alert('Error', `The date of birth you entered indicates you are ${calculatedAge} years old, but you entered ${enteredAge} years old. Please check your date of birth and age.`);
          return false;
        }
        
        // Verify calculated age is within valid range
        if (calculatedAge < 21 || calculatedAge > 40) {
          Alert.alert('Error', `Based on your date of birth, you are ${calculatedAge} years old. Age must be between 21 and 40.`);
          return false;
        }
        
        if (!applicationData.phoneNumber.trim()) {
          Alert.alert('Error', 'Please enter your phone number');
          return false;
        }
        if (!validatePhone(applicationData.phoneNumber.trim())) {
          Alert.alert('Error', 'Please enter a valid phone number (at least 10 digits)');
          return false;
        }
        if (!applicationData.email.trim()) {
          Alert.alert('Error', 'Please enter your email address');
          return false;
        }
        if (!validateEmail(applicationData.email.trim())) {
          Alert.alert('Error', 'Please enter a valid email address');
          return false;
        }
        if (!applicationData.hearAboutUs.trim()) {
          Alert.alert('Error', 'Please indicate how you heard about us');
          return false;
        }
        return true;
      
      case 2:
        if (!applicationData.previousPregnancies.trim()) {
          Alert.alert('Error', 'Please indicate if you have had previous pregnancies');
          return false;
        }
        return true;
      
      case 3:
        if (!applicationData.smokingStatus) {
          Alert.alert('Error', 'Please indicate your smoking status');
          return false;
        }
        if (!applicationData.employmentStatus) {
          Alert.alert('Error', 'Please indicate your employment status');
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
      Alert.alert('Error', 'Please enter email and password');
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
    if (!validateEmail(authEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email');
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
      Alert.alert('Progress Saved', 'Account created and progress saved. Please continue.');
    } catch (error) {
      console.error('Lazy signup error:', error);
      Alert.alert('Error', error.message || 'Failed to save progress');
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
        'Application Submitted Successfully! 🎉',
        'Thank you for submitting your surrogacy application. Our team will review your application and contact you within 5-7 business days.',
        [
          {
            text: 'OK',
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
      Alert.alert('Submission Error', error.message || 'There was an error submitting your application. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>Please provide your basic personal information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Legal Name *</Text>
        <Text style={styles.subLabel}>Please list in first, middle, last format</Text>
        <TextInput
          style={styles.input}
          value={applicationData.fullName}
          onChangeText={(value) => updateField('fullName', value)}
          placeholder="First Middle Last"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age *</Text>
        <TextInput
          key={`age-${formVersion}`}
          style={styles.input}
          value={applicationData.age || ''}
          onChangeText={(value) => updateField('age', value)}
          placeholder="Enter your age (21-40)"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date of Birth *</Text>
        <Text style={styles.subLabel}>Please list in month, day, year format</Text>
        <TextInput
          key={`dob-${formVersion}`}
          style={styles.input}
          value={applicationData.dateOfBirth || ''}
          onChangeText={(value) => updateField('dateOfBirth', value)}
          placeholder="MM/DD/YYYY"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.phoneNumber}
          onChangeText={(value) => updateField('phoneNumber', value)}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          value={applicationData.email}
          onChangeText={(value) => updateField('email', value)}
          placeholder="Enter your email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Race</Text>
        <TextInput
          style={styles.input}
          value={applicationData.race}
          onChangeText={(value) => updateField('race', value)}
          placeholder="Enter your race (optional)"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.location}
          onChangeText={(value) => updateField('location', value)}
          placeholder="Enter your location"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How did you hear about us? *</Text>
        <Text style={styles.subLabel}>Please be specific (e.g., Google, Facebook, friend referral)</Text>
        <TextInput
          key={`hear-${formVersion}`}
          style={styles.input}
          value={applicationData.hearAboutUs || ''}
          onChangeText={(value) => updateField('hearAboutUs', value)}
          placeholder="e.g., Google search, Facebook ad, friend referral"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Medical Information</Text>
      <Text style={styles.stepDescription}>Please provide your medical history and pregnancy experience</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Previous Pregnancies *</Text>
        <Text style={styles.subLabel}>How many pregnancies have you had? (Include live births and miscarriages)</Text>
        <TextInput
          style={styles.input}
          value={applicationData.previousPregnancies}
          onChangeText={(value) => updateField('previousPregnancies', value)}
          placeholder="Enter number (e.g., 2)"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Previous Surrogacy Experience</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.previousSurrogacy === true && styles.radioButtonSelected]}
            onPress={() => updateField('previousSurrogacy', true)}
          >
            <Text style={[styles.radioText, applicationData.previousSurrogacy === true && styles.radioTextSelected]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.previousSurrogacy === false && styles.radioButtonSelected]}
            onPress={() => updateField('previousSurrogacy', false)}
          >
            <Text style={[styles.radioText, applicationData.previousSurrogacy === false && styles.radioTextSelected]}>No</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pregnancy Complications</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.pregnancyComplications}
          onChangeText={(value) => updateField('pregnancyComplications', value)}
          placeholder="Describe any pregnancy complications (if any, type 'None' if none)"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Medications</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.currentMedications}
          onChangeText={(value) => updateField('currentMedications', value)}
          placeholder="List any current medications (type 'None' if none)"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Health Conditions</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.healthConditions}
          onChangeText={(value) => updateField('healthConditions', value)}
          placeholder="List any health conditions (type 'None' if none)"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>BMI (Body Mass Index)</Text>
        <TextInput
          style={styles.input}
          value={applicationData.bmi}
          onChangeText={(value) => updateField('bmi', value)}
          placeholder="Enter your BMI"
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Lifestyle Information</Text>
      <Text style={styles.stepDescription}>Please provide information about your lifestyle and support system</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Smoking Status *</Text>
        <View style={styles.radioContainer}>
          {['Non-smoker', 'Former smoker', 'Current smoker'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.radioButton, applicationData.smokingStatus === option && styles.radioButtonSelected]}
              onPress={() => updateField('smokingStatus', option)}
            >
              <Text style={[styles.radioText, applicationData.smokingStatus === option && styles.radioTextSelected]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Alcohol Usage</Text>
        <TextInput
          style={styles.input}
          value={applicationData.alcoholUsage}
          onChangeText={(value) => updateField('alcoholUsage', value)}
          placeholder="Describe your alcohol usage"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Exercise Routine</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.exerciseRoutine}
          onChangeText={(value) => updateField('exerciseRoutine', value)}
          placeholder="Describe your exercise routine"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Employment Status *</Text>
        <View style={styles.radioContainer}>
          {['Employed Full-time', 'Employed Part-time', 'Self-employed', 'Unemployed', 'Student'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.radioButton, applicationData.employmentStatus === option && styles.radioButtonSelected]}
              onPress={() => updateField('employmentStatus', option)}
            >
              <Text style={[styles.radioText, applicationData.employmentStatus === option && styles.radioTextSelected]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Support System</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.supportSystem}
          onChangeText={(value) => updateField('supportSystem', value)}
          placeholder="Describe your support system (family, friends, etc.)"
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>Legal & Background Information</Text>
      <Text style={styles.stepDescription}>Please provide legal and background information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Criminal Background</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.criminalBackground === false && styles.radioButtonSelected]}
            onPress={() => updateField('criminalBackground', false)}
          >
            <Text style={[styles.radioText, applicationData.criminalBackground === false && styles.radioTextSelected]}>No criminal record</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.criminalBackground === true && styles.radioButtonSelected]}
            onPress={() => updateField('criminalBackground', true)}
          >
            <Text style={[styles.radioText, applicationData.criminalBackground === true && styles.radioTextSelected]}>Has criminal record</Text>
          </TouchableOpacity>
        </View>
      </View>

      {applicationData.criminalBackground && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Please Explain</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={applicationData.legalIssues}
            onChangeText={(value) => updateField('legalIssues', value)}
            placeholder="Please provide details"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Insurance Coverage</Text>
        <TextInput
          style={styles.input}
          value={applicationData.insuranceCoverage}
          onChangeText={(value) => updateField('insuranceCoverage', value)}
          placeholder="Describe your health insurance coverage"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Financial Stability</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.financialStability}
          onChangeText={(value) => updateField('financialStability', value)}
          placeholder="Briefly describe your financial situation"
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text style={styles.stepTitle}>Preferences & Additional Information</Text>
      <Text style={styles.stepDescription}>Please provide your preferences and any additional comments</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Compensation Expectations</Text>
        <TextInput
          style={styles.input}
          value={applicationData.compensationExpectations}
          onChangeText={(value) => updateField('compensationExpectations', value)}
          placeholder="Your compensation expectations (optional)"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Timeline Availability</Text>
        <TextInput
          style={styles.input}
          value={applicationData.timelineAvailability}
          onChangeText={(value) => updateField('timelineAvailability', value)}
          placeholder="When are you available to start? (optional)"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Willingness to Travel</Text>
        <View style={styles.radioContainer}>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.travelWillingness === true && styles.radioButtonSelected]}
            onPress={() => updateField('travelWillingness', true)}
          >
            <Text style={[styles.radioText, applicationData.travelWillingness === true && styles.radioTextSelected]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, applicationData.travelWillingness === false && styles.radioButtonSelected]}
            onPress={() => updateField('travelWillingness', false)}
          >
            <Text style={[styles.radioText, applicationData.travelWillingness === false && styles.radioTextSelected]}>No</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Special Preferences</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.specialPreferences}
          onChangeText={(value) => updateField('specialPreferences', value)}
          placeholder="Any special preferences or requirements (optional)"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Additional Comments</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.additionalComments}
          onChangeText={(value) => updateField('additionalComments', value)}
          placeholder="Any additional comments or information you'd like to share (optional)"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Invite Code</Text>
        <Text style={styles.subLabel}>If someone invited you, enter their code (optional)</Text>
        <TextInput
          style={styles.input}
          value={applicationData.referralCode}
          onChangeText={(value) => updateField('referralCode', value)}
          placeholder="Enter invite code (optional)"
          autoCapitalize="none"
        />
      </View>
    </View>
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
              <Text style={styles.backHomeText}>← Back to Home</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Surrogacy Application</Text>
            <Text style={styles.subtitle}>Complete your application to become a surrogate</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>Step {currentStep} / {totalSteps}</Text>
          </View>
        </View>

        <View style={styles.form}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
                <Text style={styles.previousButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < totalSteps ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>
                  {isLoading ? 'Submitting...' : 'Submit Application'}
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
              <Text style={styles.authTitle}>Save Progress</Text>
              <Text style={styles.authSubtitle}>
                Create an account to save your application progress.
              </Text>
              <TextInput
                style={styles.authInput}
                placeholder="Email"
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
                  <Text style={styles.authCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authButton, styles.authSave]}
                  onPress={handleLazySignup}
                  disabled={authLoading}
                >
                  <Text style={styles.authSaveText}>{authLoading ? 'Saving...' : 'Save & Continue'}</Text>
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
