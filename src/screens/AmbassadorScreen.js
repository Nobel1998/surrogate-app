import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AmbassadorScreen() {
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
  const [referralCode, setReferralCode] = useState('');
  const [ambassadorStatus, setAmbassadorStatus] = useState(null);
  const [ambassadorHistory, setAmbassadorHistory] = useState([]);
  
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadAmbassadorStatus();
  }, []);

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
        'Application Submitted Successfully! 🎉',
        `Thank you for your interest in becoming a surrogate ambassador! We will review your application and contact you within 24-48 hours.\n\nYour referral code: ${application.referralCode}`,
        [{ text: 'OK', onPress: () => {} }]
      );
    } catch (error) {
      Alert.alert('Submission Error', 'There was an error submitting your application. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.formStep}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      
      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.fullName}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, fullName: text }))}
        placeholder="Enter your full name"
        blurOnSubmit={true}
      />
      
      <Text style={styles.label}>Email Address *</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.email}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, email: text }))}
        placeholder="Enter your email"
        keyboardType="email-address"
        blurOnSubmit={true}
      />
      
      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.phone}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, phone: text }))}
        placeholder="Enter your phone number"
        keyboardType="phone-pad"
        blurOnSubmit={true}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.formStep}>
      <Text style={styles.stepTitle}>Experience & Motivation</Text>
      
      <Text style={styles.label}>Relevant Experience *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={ambassadorData.experience}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, experience: text }))}
        placeholder="Describe your experience with surrogacy, healthcare, or community outreach..."
        multiline
        numberOfLines={4}
        blurOnSubmit={true}
      />
      
      <Text style={styles.label}>Motivation *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={ambassadorData.motivation}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, motivation: text }))}
        placeholder="Why do you want to become a surrogate ambassador?"
        multiline
        numberOfLines={4}
        blurOnSubmit={true}
      />
      
      <Text style={styles.label}>Social Media Presence</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.socialMedia}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, socialMedia: text }))}
        placeholder="Instagram, Facebook, LinkedIn handles (optional)"
        blurOnSubmit={true}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.formStep}>
      <Text style={styles.stepTitle}>Referral Information</Text>
      
      <Text style={styles.label}>Expected Monthly Referrals</Text>
      <TextInput
        style={styles.input}
        value={ambassadorData.expectedReferrals}
        onChangeText={(text) => setAmbassadorData(prev => ({ ...prev, expectedReferrals: text }))}
        placeholder="How many referrals do you expect per month?"
        keyboardType="numeric"
        blurOnSubmit={true}
      />
      
      <View style={styles.referralCodeSection}>
        <Text style={styles.label}>Your Referral Code</Text>
        <View style={styles.referralCodeContainer}>
          <Text style={styles.referralCodeText}>
            {referralCode || 'Click Generate to create your code'}
          </Text>
          <TouchableOpacity style={styles.generateButton} onPress={generateReferralCode}>
            <Text style={styles.generateButtonText}>Generate</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.referralCodeNote}>
          Share this code with potential surrogates. You'll earn $500 for each successful match!
        </Text>
      </View>
      
      <TouchableOpacity style={styles.calculatorButton} onPress={() => setShowCalculator(true)}>
        <Text style={styles.calculatorButtonText}>💰 Calculate Potential Earnings</Text>
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
            <Text style={styles.historyTitle}>📋 Application History</Text>
          </View>
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>📝</Text>
            <Text style={styles.noHistoryText}>No application records yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Join our ambassador program and earn rewards for every successful referral!
            </Text>
            <TouchableOpacity 
              style={styles.startApplicationButton}
              onPress={() => {
                setCurrentStep(1);
                scrollToTop();
              }}
            >
              <Text style={styles.startApplicationButtonText}>Start Application</Text>
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
      <Text style={styles.stepTitle}>Application Status</Text>
      
      {ambassadorStatus ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Your Latest Ambassador Application</Text>
          <Text style={styles.statusSubtitle}>ID: {ambassadorStatus.id}</Text>
          <Text style={styles.statusSubtitle}>Submitted: {new Date(ambassadorStatus.submittedAt).toLocaleDateString()}</Text>
          
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {ambassadorStatus.status === 'pending' ? '📋 Under Review' : 
               ambassadorStatus.status === 'approved' ? '✅ Approved' :
               ambassadorStatus.status === 'rejected' ? '❌ Not Selected' :
               '⏳ Pending'}
            </Text>
          </View>
          
          {ambassadorStatus.status === 'approved' && (
            <View style={styles.ambassadorDashboard}>
              <Text style={styles.dashboardTitle}>🎉 Welcome to the Ambassador Program!</Text>
              <Text style={styles.dashboardSubtitle}>You're now an official surrogate ambassador</Text>
              
              <View style={styles.dashboardStats}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Referrals Made</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Successful Matches</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>$0</Text>
                  <Text style={styles.statLabel}>Total Earnings</Text>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.referralInfo}>
            <Text style={styles.referralInfoTitle}>Your Referral Code</Text>
            <Text style={styles.referralCodeDisplay}>{ambassadorStatus.referralCode}</Text>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => setShowReferralModal(true)}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Text style={styles.shareButtonText}>📤 Share Referral Code</Text>
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
              {ambassadorStatus.status === 'rejected' ? '🔄 Reapply for Ambassador Program' : 
               ambassadorStatus.status === 'pending' ? '📝 Submit New Application' :
               ambassadorStatus.status === 'approved' ? '📝 Submit Another Application' :
               '📝 Submit New Application'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noApplicationText}>No application found.</Text>
      )}
    </View>
  );

  const renderCalculator = () => (
    <Modal visible={showCalculator} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCalculator(false)}>
            <Text style={styles.cancelButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Earnings Calculator</Text>
          <View style={{ width: 50 }} />
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.calculatorTitle}>Calculate Your Potential Earnings</Text>
          
          <Text style={styles.label}>Number of Referrals</Text>
          <TextInput
            style={styles.input}
            value={calculatorData.referrals}
            onChangeText={(text) => setCalculatorData(prev => ({ ...prev, referrals: text }))}
            placeholder="Enter number of referrals"
            keyboardType="numeric"
            blurOnSubmit={true}
          />
          
          <Text style={styles.label}>Successful Matches</Text>
          <TextInput
            style={styles.input}
            value={calculatorData.successfulMatches}
            onChangeText={(text) => setCalculatorData(prev => ({ ...prev, successfulMatches: text }))}
            placeholder="Enter successful matches"
            keyboardType="numeric"
            blurOnSubmit={true}
          />
          
          {calculatorData.referrals && calculatorData.successfulMatches && (
            <View style={styles.calculationResults}>
              <Text style={styles.calculationTitle}>Your Potential Earnings</Text>
              {(() => {
                const earnings = calculateEarnings();
                return (
                  <>
                    <View style={styles.earningsRow}>
                      <Text style={styles.earningsLabel}>Base Earnings:</Text>
                      <Text style={styles.earningsValue}>${earnings.baseEarnings.toLocaleString()}</Text>
                    </View>
                    {earnings.bonus > 0 && (
                      <View style={styles.earningsRow}>
                        <Text style={styles.earningsLabel}>Bonus (10%):</Text>
                        <Text style={styles.earningsValue}>+${earnings.bonus.toLocaleString()}</Text>
                      </View>
                    )}
                    <View style={[styles.earningsRow, styles.totalEarnings]}>
                      <Text style={styles.totalLabel}>Total Earnings:</Text>
                      <Text style={styles.totalValue}>${earnings.totalEarnings.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.earningsNote}>
                      * $500 per successful match + 10% bonus after 5 matches
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
            <Text style={styles.cancelButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Share Referral Code</Text>
          <View style={{ width: 50 }} />
        </View>
        
        <View style={styles.modalContent}>
          <Text style={styles.shareTitle}>Share Your Referral Code</Text>
          <Text style={styles.shareDescription}>
            Share this code with potential surrogates. When they use your code during registration, you'll earn $500 for each successful match!
          </Text>
          
          <View style={styles.referralCodeShare}>
            <Text style={styles.referralCodeShareText}>{ambassadorStatus?.referralCode}</Text>
            <TouchableOpacity style={styles.copyButton}>
              <Text style={styles.copyButtonText}>📋 Copy</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.shareInstructions}>
            Share via:
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
      <Text style={styles.title}>Surrogate Ambassador Program</Text>
      
      <View style={styles.programInfo}>
        <Text style={styles.programTitle}>🌟 Become a Surrogate Ambassador</Text>
        <Text style={styles.programDescription}>
          Join our ambassador program and earn $500 for each successful surrogate match you refer!
        </Text>
        
        <View style={styles.benefitsList}>
          <Text style={styles.benefitItem}>💰 $500 per successful match</Text>
          <Text style={styles.benefitItem}>🎁 10% bonus after 5 matches</Text>
          <Text style={styles.benefitItem}>📱 Your own referral code</Text>
          <Text style={styles.benefitItem}>🤝 Support from our team</Text>
          <Text style={styles.benefitItem}>📈 Track your earnings</Text>
        </View>
      </View>
      
      {(!ambassadorStatus || ambassadorStatus.status === 'rejected') && (
        <>
          
          {ambassadorStatus?.status === 'rejected' && (
            <View style={styles.reapplyCard}>
              <Text style={styles.reapplyTitle}>🔄 Reapply for Ambassador Program</Text>
              <Text style={styles.reapplyText}>
                Your previous application was not selected. You can reapply with updated information.
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
                <Text style={styles.reapplyButtonText}>Start New Application</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${(currentStep / 3) * 100}%` }]} />
          </View>
          <Text style={styles.stepIndicator}>Step {currentStep} of 3</Text>
        </>
      )}
      
      {renderCurrentStep()}
      
      {currentStep <= 3 && (
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={prevStep}>
              <Text style={styles.secondaryButtonText}>Previous</Text>
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
                {currentStep === 3 ? 'Submit Application' : 'Next Step'}
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