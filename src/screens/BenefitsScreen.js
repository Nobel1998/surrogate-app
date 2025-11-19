import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, StatusBar } from 'react-native';

export default function BenefitsScreen({ navigation }) {
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [baseCompensation, setBaseCompensation] = useState('60000');
  const [additionalPayments, setAdditionalPayments] = useState('0');
  const [estimatedTotal, setEstimatedTotal] = useState(60000);

  const calculateTotal = () => {
    const base = parseFloat(baseCompensation) || 0;
    const additional = parseFloat(additionalPayments) || 0;
    const total = base + additional;
    setEstimatedTotal(total);
  };

  const showCalculator = () => {
    setCalculatorVisible(true);
  };

  const hideCalculator = () => {
    setCalculatorVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>💎 Best Benefit Package</Text>
          <Text style={styles.subtitle}>One of the highest compensation and benefits in the market</Text>
        </View>
      
      {/* Apply Now Button */}
      {navigation && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => navigation.navigate('SurrogateApplication')}
          >
            <Text style={styles.applyButtonText}>📝 Apply Now - Start Your Surrogacy Journey</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Best Benefit Highlights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌟 What Makes Our Package the Best</Text>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightIcon}>💰</Text>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>Highest Compensation</Text>
            <Text style={styles.highlightDescription}>
              One of the most competitive base compensations in the market
            </Text>
          </View>
        </View>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightIcon}>🎯</Text>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>Customizable Packages</Text>
            <Text style={styles.highlightDescription}>
              Tailored to your unique circumstances. We'll match benefits from other agencies
            </Text>
          </View>
        </View>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightIcon}>🛡️</Text>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>Comprehensive Coverage</Text>
            <Text style={styles.highlightDescription}>
              All-encompassing benefits providing security and peace of mind
            </Text>
          </View>
        </View>
      </View>

      {/* Base Compensation Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Compensation Structure</Text>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>Base Surrogacy Fee</Text>
          <Text style={styles.compensationAmount}>$60,000</Text>
        </View>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>Successful Transfer Bonus</Text>
          <Text style={styles.compensationAmount}>$5,000</Text>
        </View>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>Pregnancy Confirmation Bonus</Text>
          <Text style={styles.compensationAmount}>$2,000</Text>
        </View>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>Monthly Allowance (9 months)</Text>
          <Text style={styles.compensationAmount}>$200/month</Text>
        </View>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>Delivery Bonus</Text>
          <Text style={styles.compensationAmount}>$3,000</Text>
        </View>
        <View style={styles.totalCompensation}>
          <Text style={styles.totalLabel}>Total Estimated Income</Text>
          <Text style={styles.totalAmount}>$70,800</Text>
        </View>
      </View>

      {/* Additional Benefits Policy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎁 Comprehensive Benefits Coverage</Text>
        
        <View style={styles.benefitCategory}>
          <Text style={styles.benefitCategoryTitle}>Healthcare</Text>
          <Text style={styles.benefitItem}>• Full medical insurance coverage</Text>
          <Text style={styles.benefitItem}>• Complete prenatal care expenses</Text>
          <Text style={styles.benefitItem}>• Delivery medical costs covered</Text>
          <Text style={styles.benefitItem}>• Postpartum recovery care</Text>
        </View>

        <View style={styles.benefitCategory}>
          <Text style={styles.benefitCategoryTitle}>Life Support</Text>
          <Text style={styles.benefitItem}>• Nutritional supplement allowance</Text>
          <Text style={styles.benefitItem}>• Transportation expense reimbursement</Text>
          <Text style={styles.benefitItem}>• Psychological counseling services</Text>
          <Text style={styles.benefitItem}>• Legal consultation support</Text>
        </View>

        <View style={styles.benefitCategory}>
          <Text style={styles.benefitCategoryTitle}>Special Protection</Text>
          <Text style={styles.benefitItem}>• Accident insurance coverage</Text>
          <Text style={styles.benefitItem}>• Income loss compensation</Text>
          <Text style={styles.benefitItem}>• Family support services</Text>
          <Text style={styles.benefitItem}>• 24/7 emergency contact</Text>
        </View>
      </View>

      {/* Income Calculator */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧮 Income Calculator</Text>
        <Text style={styles.calculatorDescription}>
          Use our calculator to estimate your surrogacy income
        </Text>
        
        <TouchableOpacity style={styles.calculatorButton} onPress={showCalculator}>
          <Text style={styles.calculatorButtonText}>Open Income Calculator</Text>
        </TouchableOpacity>

        {calculatorVisible && (
          <View style={styles.calculatorContainer}>
            <View style={styles.calculatorHeader}>
              <Text style={styles.calculatorTitle}>Income Estimation Calculator</Text>
              <TouchableOpacity onPress={hideCalculator}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Base Surrogacy Fee ($)</Text>
              <TextInput
                style={styles.input}
                value={baseCompensation}
                onChangeText={setBaseCompensation}
                keyboardType="numeric"
                placeholder="60000"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Bonuses ($)</Text>
              <TextInput
                style={styles.input}
                value={additionalPayments}
                onChangeText={setAdditionalPayments}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <TouchableOpacity style={styles.calculateButton} onPress={calculateTotal}>
              <Text style={styles.calculateButtonText}>Calculate Total Income</Text>
            </TouchableOpacity>

            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Estimated Total Income</Text>
              <Text style={styles.resultAmount}>${estimatedTotal.toLocaleString()}</Text>
            </View>

            <View style={styles.breakdownContainer}>
              <Text style={styles.breakdownTitle}>Income Breakdown</Text>
              <Text style={styles.breakdownItem}>Base Fee: ${baseCompensation}</Text>
              <Text style={styles.breakdownItem}>Additional Bonuses: ${additionalPayments}</Text>
              <Text style={styles.breakdownItem}>Monthly Allowance: $1,800 (9 months)</Text>
              <Text style={styles.breakdownItem}>Medical Benefits: Fully Covered</Text>
            </View>
          </View>
        )}
      </View>

      {/* Payment Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Payment Schedule</Text>
        <View style={styles.paymentSchedule}>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>Contract Signing</Text>
            <Text style={styles.paymentAmount}>$5,000</Text>
            <Text style={styles.paymentDescription}>Paid immediately after signing</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>Successful Transfer</Text>
            <Text style={styles.paymentAmount}>$5,000</Text>
            <Text style={styles.paymentDescription}>Paid after transfer confirmation</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>Pregnancy Confirmation</Text>
            <Text style={styles.paymentAmount}>$2,000</Text>
            <Text style={styles.paymentDescription}>Paid 6 weeks after pregnancy</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>Monthly Allowance</Text>
            <Text style={styles.paymentAmount}>$200</Text>
            <Text style={styles.paymentDescription}>Paid on the 1st of each month</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>Delivery Completion</Text>
            <Text style={styles.paymentAmount}>$58,800</Text>
            <Text style={styles.paymentDescription}>Paid within 30 days after delivery</Text>
          </View>
        </View>
      </View>

      {/* Best Support System */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤝 Best Support System</Text>
        <Text style={styles.supportDescription}>
          Multi-faceted support providing guidance and care at every stage
        </Text>
        
        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>👩‍💼</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Experienced Case Coordinators</Text>
            <Text style={styles.supportDescription}>
              Your coordinator is an experienced surrogate herself, offering deep personal understanding of your journey
            </Text>
          </View>
        </View>

        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>⏰</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>24/7 One-on-One Support</Text>
            <Text style={styles.supportDescription}>
              Dedicated case coordinator from screening through delivery and beyond. Immediate availability for emergencies
            </Text>
          </View>
        </View>

        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>🧠</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Professional Psychological Support</Text>
            <Text style={styles.supportDescription}>
              Continuous one-on-one psychological support from legal clearance until 2-6 months after birth
            </Text>
          </View>
        </View>

        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>👥</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Community & Pampering</Text>
            <Text style={styles.supportDescription}>
              Monthly group meetings and sponsored relaxation events for surrogates upon legal clearance
            </Text>
          </View>
        </View>

        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>🔄</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Flexibility & Assurance</Text>
            <Text style={styles.supportDescription}>
              Not satisfied with your coordinator? We'll provide a replacement. Don't qualify yet? We'll work with you to meet requirements
            </Text>
          </View>
        </View>
      </View>

      {/* Frequently Asked Questions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>❓ Frequently Asked Questions</Text>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Q: Are taxes included in the compensation?</Text>
          <Text style={styles.faqAnswer}>A: Base compensation includes all taxes, no additional tax payment required.</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Q: What happens if the pregnancy fails?</Text>
          <Text style={styles.faqAnswer}>A: We provide psychological support and additional compensation based on the situation.</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Q: How are medical expenses reimbursed?</Text>
          <Text style={styles.faqAnswer}>A: All related medical expenses are paid directly by us, no upfront payment required.</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Q: Can the contract be terminated early?</Text>
          <Text style={styles.faqAnswer}>A: Yes, we will pay compensation proportionally based on completed stages.</Text>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FB' },
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  scrollContent: { paddingBottom: 20 },
  headerContainer: { paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 20, marginTop: 10, marginBottom: 8, textAlign: 'center', color: '#2A7BF6' },
  subtitle: { fontSize: 14, color: '#666', marginHorizontal: 20, marginBottom: 16, textAlign: 'center', fontStyle: 'italic' },
  applyButton: { backgroundColor: '#28A745', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', marginHorizontal: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  applyButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  section: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2A7BF6', marginBottom: 12 },
  
  // Highlight items styles
  highlightItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  highlightIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  highlightContent: { flex: 1 },
  highlightTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  highlightDescription: { fontSize: 14, color: '#666', lineHeight: 20 },
  
  // Support system styles
  supportDescription: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  supportItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  supportIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  supportContent: { flex: 1 },
  supportTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  
  // Compensation details styles
  compensationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  compensationLabel: { fontSize: 16, color: '#333', flex: 1 },
  compensationAmount: { fontSize: 16, fontWeight: 'bold', color: '#2A7BF6' },
  totalCompensation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 8, backgroundColor: '#E8F4FD', borderRadius: 8, paddingHorizontal: 12 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#2A7BF6' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#2A7BF6' },
  
  // Benefits policy styles
  benefitCategory: { marginBottom: 16 },
  benefitCategoryTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  benefitItem: { fontSize: 14, color: '#666', marginBottom: 4, marginLeft: 8 },
  
  // Calculator styles
  calculatorDescription: { fontSize: 14, color: '#666', marginBottom: 12 },
  calculatorButton: { backgroundColor: '#2A7BF6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  calculatorButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  calculatorContainer: { backgroundColor: '#F8F9FB', borderRadius: 8, padding: 16, marginTop: 12 },
  calculatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calculatorTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  closeButton: { fontSize: 20, color: '#666' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  calculateButton: { backgroundColor: '#28A745', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  calculateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultContainer: { backgroundColor: '#E8F4FD', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  resultLabel: { fontSize: 16, color: '#333', marginBottom: 4 },
  resultAmount: { fontSize: 24, fontWeight: 'bold', color: '#2A7BF6' },
  breakdownContainer: { backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  breakdownTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  breakdownItem: { fontSize: 14, color: '#666', marginBottom: 4 },
  
  // Payment schedule styles
  paymentSchedule: { marginTop: 8 },
  paymentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  paymentPhase: { fontSize: 16, color: '#333', flex: 1 },
  paymentAmount: { fontSize: 16, fontWeight: 'bold', color: '#2A7BF6', marginRight: 8 },
  paymentDescription: { fontSize: 12, color: '#666', flex: 1, textAlign: 'right' },
  
  // FAQ styles
  faqItem: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  faqQuestion: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  faqAnswer: { fontSize: 14, color: '#666', lineHeight: 20 },
}); 