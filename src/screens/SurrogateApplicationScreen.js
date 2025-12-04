import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';

export default function SurrogateApplicationScreen({ navigation }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [isLoading, setIsLoading] = useState(false);
  
  const [applicationData, setApplicationData] = useState({
    // Step 1: Personal Information
    fullName: user?.name || '',
    age: '',
    dateOfBirth: user?.dateOfBirth || '',
    phoneNumber: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    hearAboutUs: '',
    
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

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    
    try {
      // 获取当前认证用户ID
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('Please log in to submit an application');
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
              navigation.goBack();
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
          style={styles.input}
          value={applicationData.age}
          onChangeText={(value) => updateField('age', value)}
          placeholder="Enter your age (21-40)"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date of Birth *</Text>
        <Text style={styles.subLabel}>Please list in month, day, year format</Text>
        <TextInput
          style={styles.input}
          value={applicationData.dateOfBirth}
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
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={applicationData.address}
          onChangeText={(value) => updateField('address', value)}
          placeholder="Enter your full address"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How did you hear about us? *</Text>
        <Text style={styles.subLabel}>Please be specific (e.g., Google, Facebook, friend referral)</Text>
        <TextInput
          style={styles.input}
          value={applicationData.hearAboutUs}
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
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
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
});
