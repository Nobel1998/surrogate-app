import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AmbassadorScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [ambassadorData, setAmbassadorData] = useState({
    fullName: '',
    email: '',
    phone: '',
    experience: '',
    motivation: '',
    referralCode: '',
    socialMedia: '',
    expectedReferrals: ''
  });
  const [calculatorData, setCalculatorData] = useState({
    referrals: '',
    successfulMatches: ''
  });
  // Use the referral code from the user profile if available, otherwise fall back to local state (though we don't generate locally anymore)
  const [referralCode, setReferralCode] = useState(user?.inviteCode || ''); 
  const [ambassadorStatus, setAmbassadorStatus] = useState(null);
  const [ambassadorHistory, setAmbassadorHistory] = useState([]);
  
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (user?.inviteCode) {
      setReferralCode(user.inviteCode);
    }
    loadAmbassadorStatus();
  }, [user]);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const loadAmbassadorStatus = async () => {
    try {
      const savedStatus = await AsyncStorage.getItem('ambassador_status');
      const savedHistory = await AsyncStorage.getItem('ambassador_history');
      
      if (savedStatus) {
        setAmbassadorStatus(JSON.parse(savedStatus));
      }
      
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setAmbassadorHistory(history);
        // 设置最新的申请为当前状态
        if (history.length > 0) {
          setAmbassadorStatus(history[0]);
        }
      }
    } catch (error) {
      console.error('Error loading ambassador status:', error);
    }
  };

  const generateReferralCode = () => {
    const code = 'AMB' + Math.random().toString(36).substr(2, 6).toUpperCase();
    setReferralCode(code);
    setAmbassadorData(prev => ({ ...prev, referralCode: code }));
  };

  const calculateEarnings = () => {
    const referrals = parseInt(calculatorData.referrals) || 0;
    const successfulMatches = parseInt(calculatorData.successfulMatches) || 0;
    
    const baseFee = 500; // $500 per successful match
    const bonusThreshold = 5; // Bonus after 5 successful matches
    const bonusRate = 0.1; // 10% bonus
    
    const baseEarnings = successfulMatches * baseFee;
    const bonus = successfulMatches >= bonusThreshold ? baseEarnings * bonusRate : 0;
    const totalEarnings = baseEarnings + bonus;
    
    return {
      baseEarnings,
      bonus,
      totalEarnings,
      referrals,
      successfulMatches
    };
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\d\-.()+ ]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!ambassadorData.fullName || !ambassadorData.fullName.trim()) {
          Alert.alert('Error', 'Please enter your full name.');
          return false;
        }
        if (!ambassadorData.email || !ambassadorData.email.trim()) {
          Alert.alert('Error', 'Please enter your email address.');
          return false;
        }
        if (!validateEmail(ambassadorData.email.trim())) {
          Alert.alert('Error', 'Please enter a valid email address');
          return false;
        }
        if (!ambassadorData.phone || !ambassadorData.phone.trim()) {
          Alert.alert('Error', 'Please enter your phone number.');
          return false;
        }
        if (!validatePhone(ambassadorData.phone.trim())) {
          Alert.alert('Error', 'Please enter a valid phone number (at least 10 digits)');
          return false;
        }
        return true;
      
      case 2:
        if (!ambassadorData.experience || !ambassadorData.experience.trim()) {
          Alert.alert('Error', 'Please describe your relevant experience.');
          return false;
        }
        if (!ambassadorData.motivation || !ambassadorData.motivation.trim()) {
          Alert.alert('Error', 'Please explain your motivation for becoming a surrogate ambassador.');
          return false;
        }
        return true;
      
      case 3:
        // Step 3 fields are optional, so always return true
        return true;
      
      default:
        return true;
    }
  };

  const submitAmbassadorApplication = async () => {
    // Validate all required steps before submission
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const application = {
        id: Date.now().toString(),
        ...ambassadorData,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        referralCode: referralCode || ambassadorData.referralCode
      };

      // 添加到历史记录
      const updatedHistory = [application, ...ambassadorHistory];
      setAmbassadorHistory(updatedHistory);
      setAmbassadorStatus(application);
      setCurrentStep(4);
      
      // 保存到本地存储
      await AsyncStorage.setItem('ambassador_status', JSON.stringify(application));
      await AsyncStorage.setItem('ambassador_history', JSON.stringify(updatedHistory));

      Alert.alert(
        t('ambassador.applicationSubmitted'),
        t('ambassador.applicationSubmittedMessage', { code: application.referralCode }),
        [{ text: t('common.close'), onPress: () => {} }]
      );
    } catch (error) {
      Alert.alert(t('ambassador.submissionError'), t('ambassador.submissionErrorMessage'));
      console.error('Submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.formStep}>
      <Text style={styles.stepTitle}>{t('ambassador.stepPersonalInfo')}</Text>
      
      <Text style={styles.label}>{t('ambassador.fullName')}</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.fullName}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, fullName: text }))}
        placeholder={t('ambassador.enterFullName')}
        blurOnSubmit={true}
      />
      
      <Text style={styles.label}>{t('ambassador.emailAddress')}</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.email}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, email: text }))}
        placeholder={t('ambassador.enterEmail')}
        keyboardType="email-address"
        blurOnSubmit={true}
      />
      
      <Text style={styles.label}>{t('ambassador.phoneNumber')}</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.phone}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, phone: text }))}
        placeholder={t('ambassador.enterPhone')}
        keyboardType="phone-pad"
        blurOnSubmit={true}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.formStep}>
      <Text style={styles.stepTitle}>{t('ambassador.stepExperience')}</Text>
      
      <Text style={styles.label}>{t('ambassador.relevantExperience')}</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={ambassadorData.experience}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, experience: text }))}
        placeholder={t('ambassador.enterExperience')}
        multiline
        numberOfLines={4}
        blurOnSubmit={true}
      />
      
      <Text style={styles.label}>{t('ambassador.motivation')}</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={ambassadorData.motivation}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, motivation: text }))}
        placeholder={t('ambassador.enterMotivation')}
        multiline
        numberOfLines={4}
        blurOnSubmit={true}
      />
      
      <Text style={styles.label}>{t('ambassador.socialMedia')}</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.socialMedia}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, socialMedia: text }))}
        placeholder={t('ambassador.enterSocialMedia')}
        blurOnSubmit={true}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.formStep}>
      <Text style={styles.stepTitle}>{t('ambassador.stepReferralInfo')}</Text>
      
      <Text style={styles.label}>{t('ambassador.expectedReferrals')}</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.expectedReferrals}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, expectedReferrals: text }))}
        placeholder={t('ambassador.enterExpectedReferrals')}
        keyboardType="numeric"
        blurOnSubmit={true}
      />
      
      <View style={styles.referralCodeSection}>
        <Text style={styles.label}>{t('ambassador.yourReferralCode')}</Text>
        <View style={styles.referralCodeContainer}>
          <Text style={styles.referralCodeText}>
            {referralCode || t('ambassador.codeGenerated')}
          </Text>
        </View>
        <Text style={styles.referralCodeNote}>
          {t('ambassador.referralCodeNote')}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.calculatorButton} onPress={() => setShowCalculator(true)}>
        <Text style={styles.calculatorButtonText}>{t('ambassador.calculateEarnings')}</Text>
      </TouchableOpacity>
    </View>
  );

  const clearHistory = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all application history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('ambassador_history');
              await AsyncStorage.removeItem('ambassador_status');
              setAmbassadorHistory([]);
              setAmbassadorStatus(null);
              setCurrentStep(1);
              setAmbassadorData({
                fullName: '',
                email: '',
                phone: '',
                experience: '',
                motivation: '',
                referralCode: '',
                socialMedia: '',
                expectedReferrals: ''
              });
            } catch (error) {
              console.error('Error clearing history:', error);
            }
          }
        }
      ]
    );
  };

  const renderApplicationHistory = () => {
    if (ambassadorHistory.length === 0) {
      return (
        <View style={styles.historySection}>
          <View style={styles.historyHeaderContainer}>
            <Text style={styles.historyTitle}>{t('ambassador.applicationHistory')}</Text>
          </View>
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>📝</Text>
            <Text style={styles.noHistoryText}>{t('ambassador.noRecords')}</Text>
            <Text style={styles.emptyStateSubtext}>
              {t('ambassador.joinProgram')}
            </Text>
            <TouchableOpacity 
              style={styles.startApplicationButton}
              onPress={() => {
                setCurrentStep(1);
                scrollToTop();
              }}
            >
              <Text style={styles.startApplicationButtonText}>{t('ambassador.startApplication')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.historySection}>
        <View style={styles.historyHeaderContainer}>
          <Text style={styles.historyTitle}>📋 Application History</Text>
          <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear History</Text>
          </TouchableOpacity>
        </View>
        {ambassadorHistory.map((application, index) => (
          <View key={application.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyId}>#{application.id}</Text>
              <Text style={styles.historyDate}>
                {new Date(application.submittedAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.historyStatus}>
              <Text style={styles.historyStatusText}>
                {application.status === 'pending' ? '📋 Under Review' : 
                 application.status === 'approved' ? '✅ Approved' :
                 application.status === 'rejected' ? '❌ Not Selected' :
                 '⏳ Pending'}
              </Text>
            </View>
            <Text style={styles.historyReferralCode}>
              Referral Code: {application.referralCode}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.stepTitle}>{t('ambassador.applicationStatus')}</Text>
      
      {ambassadorStatus ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{t('ambassador.latestApplication')}</Text>
          <Text style={styles.statusSubtitle}>ID: {ambassadorStatus.id}</Text>
          <Text style={styles.statusSubtitle}>{t('ambassador.submitted')}: {new Date(ambassadorStatus.submittedAt).toLocaleDateString()}</Text>
          
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {ambassadorStatus.status === 'pending' ? t('ambassador.underReview') : 
               ambassadorStatus.status === 'approved' ? t('ambassador.approved') :
               ambassadorStatus.status === 'rejected' ? t('ambassador.notSelected') :
               t('ambassador.pending')}
            </Text>
          </View>
          
          {ambassadorStatus.status === 'approved' && (
            <View style={styles.ambassadorDashboard}>
              <Text style={styles.dashboardTitle}>{t('ambassador.welcomeAmbassador')}</Text>
              <Text style={styles.dashboardSubtitle}>{t('ambassador.officialAmbassador')}</Text>
              
              <View style={styles.dashboardStats}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>{t('ambassador.referralsMade')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>{t('ambassador.successfulMatches')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>$0</Text>
                  <Text style={styles.statLabel}>{t('ambassador.totalEarnings')}</Text>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.referralInfo}>
            <Text style={styles.referralInfoTitle}>{t('ambassador.yourReferralCode')}</Text>
            <Text style={styles.referralCodeDisplay}>{ambassadorStatus.referralCode}</Text>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => setShowReferralModal(true)}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Text style={styles.shareButtonText}>{t('ambassador.shareReferralCode')}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.reapplyButton}
            onPress={() => {
              setAmbassadorStatus(null);
              setCurrentStep(1);
              setAmbassadorData({
                fullName: '',
                email: '',
                phone: '',
                experience: '',
                motivation: '',
                referralCode: '',
                socialMedia: '',
                expectedReferrals: ''
              });
            }}
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <Text style={styles.reapplyButtonText}>
              {ambassadorStatus.status === 'rejected' ? t('ambassador.reapply') : 
               ambassadorStatus.status === 'pending' ? t('ambassador.submitNew') :
               ambassadorStatus.status === 'approved' ? t('ambassador.submitAnother') :
               t('ambassador.submitNew')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noApplicationText}>{t('ambassador.noApplication')}</Text>
      )}
    </View>
  );

  const renderCalculator = () => (
    <Modal visible={showCalculator} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCalculator(false)}>
            <Text style={styles.cancelButton}>{t('ambassador.close')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('ambassador.earningsCalculator')}</Text>
          <View style={{ width: 50 }} />
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.calculatorTitle}>{t('ambassador.calculatePotentialEarnings')}</Text>
          
          <Text style={styles.label}>{t('ambassador.numberOfReferrals')}</Text>
          <TextInput
            style={styles.input}
            value={calculatorData.referrals}
            onChangeText={(text) => setCalculatorData(prev => ({ ...prev, referrals: text }))}
            placeholder={t('ambassador.enterNumberOfReferrals')}
            keyboardType="numeric"
            blurOnSubmit={true}
          />
          
          <Text style={styles.label}>{t('ambassador.successfulMatches')}</Text>
          <TextInput
            style={styles.input}
            value={calculatorData.successfulMatches}
            onChangeText={(text) => setCalculatorData(prev => ({ ...prev, successfulMatches: text }))}
            placeholder={t('ambassador.enterSuccessfulMatches')}
            keyboardType="numeric"
            blurOnSubmit={true}
          />
          
          {calculatorData.referrals && calculatorData.successfulMatches && (
            <View style={styles.calculationResults}>
              <Text style={styles.calculationTitle}>{t('ambassador.potentialEarnings')}</Text>
              {(() => {
                const earnings = calculateEarnings();
                return (
                  <>
                    <View style={styles.earningsRow}>
                      <Text style={styles.earningsLabel}>{t('ambassador.baseEarnings')}</Text>
                      <Text style={styles.earningsValue}>${earnings.baseEarnings.toLocaleString()}</Text>
                    </View>
                    {earnings.bonus > 0 && (
                      <View style={styles.earningsRow}>
                        <Text style={styles.earningsLabel}>{t('ambassador.bonus10')}</Text>
                        <Text style={styles.earningsValue}>+${earnings.bonus.toLocaleString()}</Text>
                      </View>
                    )}
                    <View style={[styles.earningsRow, styles.totalEarnings]}>
                      <Text style={styles.totalLabel}>{t('ambassador.totalEarningsLabel')}</Text>
                      <Text style={styles.totalValue}>${earnings.totalEarnings.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.earningsNote}>
                      {t('ambassador.earningsNote')}
                    </Text>
                  </>
                );
              })()}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderReferralModal = () => (
    <Modal visible={showReferralModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowReferralModal(false)}>
            <Text style={styles.cancelButton}>{t('ambassador.close')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('ambassador.shareReferralCodeTitle')}</Text>
          <View style={{ width: 50 }} />
        </View>
        
        <View style={styles.modalContent}>
          <Text style={styles.shareTitle}>{t('ambassador.shareYourCode')}</Text>
          <Text style={styles.shareDescription}>
            {t('ambassador.shareDescription')}
          </Text>
          
          <View style={styles.referralCodeShare}>
            <Text style={styles.referralCodeShareText}>{ambassadorStatus?.referralCode}</Text>
            <TouchableOpacity style={styles.copyButton}>
              <Text style={styles.copyButtonText}>{t('ambassador.copy')}</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.shareInstructions}>
            {t('ambassador.shareVia')}
          </Text>
          
          <View style={styles.shareButtons}>
            <TouchableOpacity style={styles.shareMethodButton}>
              <Text style={styles.shareMethodText}>📱 SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareMethodButton}>
              <Text style={styles.shareMethodText}>📧 Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareMethodButton}>
              <Text style={styles.shareMethodText}>📱 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareMethodButton}>
              <Text style={styles.shareMethodText}>📘 Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const nextStep = () => {
    // Validate current step before proceeding
    if (!validateStep(currentStep)) {
      return; // Don't proceed if validation fails
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      submitAmbassadorApplication();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
      <Text style={styles.title}>{t('ambassador.title')}</Text>
      
      <View style={styles.programInfo}>
        <Text style={styles.programTitle}>{t('ambassador.becomeAmbassador')}</Text>
        <Text style={styles.programDescription}>
          {t('ambassador.programDescription')}
        </Text>
        
        <View style={styles.benefitsList}>
          <Text style={styles.benefitItem}>{t('ambassador.benefit500')}</Text>
          <Text style={styles.benefitItem}>{t('ambassador.benefitBonus')}</Text>
          <Text style={styles.benefitItem}>{t('ambassador.benefitCode')}</Text>
          <Text style={styles.benefitItem}>{t('ambassador.benefitSupport')}</Text>
          <Text style={styles.benefitItem}>{t('ambassador.benefitTrack')}</Text>
        </View>
      </View>
      
      {(!ambassadorStatus || ambassadorStatus.status === 'rejected') && (
        <>
          
          {ambassadorStatus?.status === 'rejected' && (
            <View style={styles.reapplyCard}>
              <Text style={styles.reapplyTitle}>{t('ambassador.reapplyTitle')}</Text>
              <Text style={styles.reapplyText}>
                {t('ambassador.reapplyText')}
              </Text>
              <TouchableOpacity 
                style={styles.reapplyButton}
                onPress={() => {
                  setAmbassadorStatus(null);
                  setCurrentStep(1);
                  setAmbassadorData({
                    fullName: '',
                    email: '',
                    phone: '',
                    experience: '',
                    motivation: '',
                    referralCode: '',
                    socialMedia: '',
                    expectedReferrals: ''
                  });
                }}
              >
                <Text style={styles.reapplyButtonText}>{t('ambassador.startNewApplication')}</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${(currentStep / 3) * 100}%` }]} />
          </View>
          <Text style={styles.stepIndicator}>{t('ambassador.stepOf', { current: currentStep, total: 3 })}</Text>
        </>
      )}
      
      {renderCurrentStep()}
      
      {currentStep <= 3 && (
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={prevStep}>
              <Text style={styles.secondaryButtonText}>{t('ambassador.previous')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={nextStep}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {currentStep === 3 ? t('ambassador.submitApplication') : t('ambassador.nextStep')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Application History - Always visible */}
      {renderApplicationHistory()}
      
      {renderCalculator()}
      {renderReferralModal()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FB'
  },
  scrollContainer: {
    flex: 1,
    width: '100%'
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 60,
    flexGrow: 1
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginTop: 0,
    marginBottom: 20,
    textAlign: 'center'
  },
  programInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  programTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A7BF6',
    marginBottom: 12,
    textAlign: 'center'
  },
  programDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22
  },
  benefitsList: {
    marginTop: 16
  },
  benefitItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    paddingLeft: 8
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8
  },
  progress: {
    height: '100%',
    backgroundColor: '#2A7BF6',
    borderRadius: 2
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  formStep: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1
  },
  historyHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#DC3545',
    fontSize: 14,
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  referralCodeSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 16
  },
  referralCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  referralCodeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2A7BF6',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  generateButton: {
    backgroundColor: '#2A7BF6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    marginLeft: 8
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  referralCodeNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic'
  },
  calculatorButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16
  },
  calculatorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  statusBadge: {
    backgroundColor: '#2A7BF6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  referralInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  referralInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  referralCodeDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A7BF6',
    textAlign: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  shareButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  noApplicationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  button: {
    flex: 1,
    backgroundColor: '#2A7BF6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  secondaryButton: {
    backgroundColor: '#6c757d'
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  buttonDisabled: {
    backgroundColor: '#ccc'
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  cancelButton: {
    fontSize: 16,
    color: '#666'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  calculatorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center'
  },
  calculationResults: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 20
  },
  calculationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  totalEarnings: {
    backgroundColor: '#e8f5e8',
    borderRadius: 6,
    paddingHorizontal: 12,
    marginTop: 8
  },
  earningsLabel: {
    fontSize: 16,
    color: '#333'
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745'
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745'
  },
  earningsNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic'
  },
  shareTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center'
  },
  shareDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center'
  },
  referralCodeShare: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  referralCodeShareText: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A7BF6',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    textAlign: 'center'
  },
  copyButton: {
    backgroundColor: '#2A7BF6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    marginLeft: 8
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  shareInstructions: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  shareButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  shareMethodButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: '48%',
    marginBottom: 8
  },
  shareMethodText: {
    fontSize: 16,
    color: '#333'
  },
  // Reapply Styles
  reapplyCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7'
  },
  reapplyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8
  },
  reapplyText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
    lineHeight: 20
  },
  reapplyButton: {
    backgroundColor: '#ffc107',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  reapplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  // Ambassador Dashboard Styles
  ambassadorDashboard: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#c3e6cb'
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
    textAlign: 'center'
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: '#155724',
    marginBottom: 16,
    textAlign: 'center'
  },
  dashboardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#c3e6cb'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#155724',
    textAlign: 'center'
  },
  // Application History Styles
  historySection: {
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center'
  },
  noHistoryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  startApplicationButton: {
    backgroundColor: '#2A7BF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startApplicationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  historyId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2A7BF6'
  },
  historyDate: {
    fontSize: 12,
    color: '#666'
  },
  historyStatus: {
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  historyStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  historyReferralCode: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace'
  }
});