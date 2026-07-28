import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function RegisterScreen({ navigation }) {
  const { register, isLoading, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    referralCode: '',
    role: 'surrogate', // 默认代母，可选 parent
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('auth.enterNameError'));
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert(t('common.error'), t('auth.enterEmailError'));
      return false;
    }
    if (!validateEmail(formData.email.trim())) {
      Alert.alert(t('common.error'), t('auth.invalidEmailError'));
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert(t('common.error'), t('auth.enterPhoneError'));
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.password.trim()) {
      Alert.alert(t('common.error'), t('auth.enterPasswordNewError'));
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordMinError'));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsDoNotMatch'));
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.dateOfBirth.trim()) {
      Alert.alert(t('common.error'), t('auth.enterDobError'));
      return false;
    }
    
    // Optional: Add simple validation for MM/DD/YYYY format
    // const dobRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    // if (!dobRegex.test(formData.dateOfBirth.trim())) {
    //   Alert.alert('Error', 'Please enter Date of Birth in MM/DD/YYYY format');
    //   return false;
    // }

    if (!formData.address.trim()) {
      Alert.alert(t('common.error'), t('auth.enterLocationError'));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRegister = async () => {
    if (!validateStep3()) return;

    const result = await register(formData);
    
    if (result.success) {
      Alert.alert(t('auth.registrationSuccessful'), t('auth.welcomeCommunity'), [
        { text: t('auth.ok') }
      ]);
    } else {
      Alert.alert(t('auth.registrationFailed'), result.error);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('LoginScreen');
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('auth.basicInfo')}</Text>
      <Text style={styles.stepDescription}>{t('auth.basicInfoDesc')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.fullName')}</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          placeholder={t('auth.enterFullName')}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.emailRequired')}</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          placeholder={t('auth.enterEmail')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.phoneRequired')}</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(value) => updateFormData('phone', value)}
          placeholder={t('auth.enterPhone')}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.iAm')}</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleOption, formData.role === 'surrogate' && styles.roleOptionActive]}
            onPress={() => updateFormData('role', 'surrogate')}
          >
            <Text style={[styles.roleText, formData.role === 'surrogate' && styles.roleTextActive]}>
              {t('auth.roleSurrogate')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, formData.role === 'parent' && styles.roleOptionActive]}
            onPress={() => updateFormData('role', 'parent')}
          >
            <Text style={[styles.roleText, formData.role === 'parent' && styles.roleTextActive]}>
              {t('auth.roleParent')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('auth.accountSecurity')}</Text>
      <Text style={styles.stepDescription}>{t('auth.accountSecurityDesc')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.passwordRequired')}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            placeholder={t('auth.enterPasswordMin')}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.confirmPasswordRequired')}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData('confirmPassword', value)}
            placeholder={t('auth.reenterPassword')}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('auth.additionalDetails')}</Text>
      <Text style={styles.stepDescription}>{t('auth.additionalDetailsDesc')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.dateOfBirth')}</Text>
        <TextInput
          style={styles.input}
          value={formData.dateOfBirth}
          onChangeText={(value) => updateFormData('dateOfBirth', value)}
          placeholder="MM/DD/YYYY"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.location')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.address}
          onChangeText={(value) => updateFormData('address', value)}
          placeholder={t('auth.enterLocation')}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.race')}</Text>
        <TextInput
          style={styles.input}
          value={formData.emergencyContact}
          onChangeText={(value) => updateFormData('emergencyContact', value)}
          placeholder={t('auth.enterRace')}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('auth.referralCodeOptional')}</Text>
        <TextInput
          style={styles.input}
          value={formData.referralCode}
          onChangeText={(value) => updateFormData('referralCode', value)}
          placeholder={t('auth.enterReferralCode')}
          autoCapitalize="characters"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.backHomeButton}
          onPress={() => navigation.navigate('Landing')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={16} color="#2A7BF6" />
          <Text style={styles.backHomeText}>{t('auth.backToHome')}</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>{t('auth.joinCommunity')}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{t('auth.stepProgress', { current: currentStep, total: totalSteps })}</Text>
          </View>
        </View>

        <View style={styles.form}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
                <Text style={styles.previousButtonText}>{t('auth.previous')}</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < totalSteps ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>{t('auth.next')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.disabledButton]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? t('auth.creatingAccount') : t('auth.completeRegistration')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!isAuthenticated && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')}</Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingTop: 16,
    paddingBottom: 20,
  },
  backHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 20,
    gap: 4,
  },
  backHomeText: {
    fontSize: 14,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
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
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2A7BF6',
    borderRadius: 2,
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
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
  },
  roleOptionActive: {
    borderColor: '#2A7BF6',
    backgroundColor: '#EAF2FF',
  },
  roleText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#2A7BF6',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: '#F8F9FB',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  },
  eyeText: {
    fontSize: 20,
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
  registerButton: {
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
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    marginRight: 8,
  },
  loginLink: {
    color: '#2A7BF6',
    fontSize: 14,
    fontWeight: '500',
  },
});