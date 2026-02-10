import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Linking, ActivityIndicator } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

const BENEFIT_PACKAGE_DOC_TYPE = 'benefit_package';

export default function BenefitsScreen({ navigation }) {
  const { t, language } = useLanguage();
  const [benefitPdfUrl, setBenefitPdfUrl] = useState(null);
  const [benefitPdfLoading, setBenefitPdfLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('global_documents')
          .select('file_url')
          .eq('document_type', BENEFIT_PACKAGE_DOC_TYPE)
          .maybeSingle();
        if (!cancelled && !error && data?.file_url) setBenefitPdfUrl(data.file_url);
      } catch (e) {
        if (!cancelled) console.warn('[BenefitsScreen] benefit package PDF load failed', e);
      } finally {
        if (!cancelled) setBenefitPdfLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openBenefitPdf = () => {
    if (benefitPdfUrl) Linking.openURL(benefitPdfUrl).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{t('benefits.title')}</Text>
          <Text style={styles.subtitle}>{t('benefits.subtitle')}</Text>
        </View>
      
      {/* Apply Now Button */}
      {navigation && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => navigation.navigate('SurrogateApplication')}
          >
            <Text style={styles.applyButtonText}>{t('benefits.applyNow')}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Best Benefit Highlights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('benefits.whatMakesBest')}</Text>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightIcon}>💰</Text>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>{t('benefits.highestCompensation')}</Text>
            <Text style={styles.highlightDescription}>
              {t('benefits.highestCompensationDesc')}
            </Text>
          </View>
        </View>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightIcon}>🎯</Text>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>{t('benefits.customizablePackages')}</Text>
            <Text style={styles.highlightDescription}>
              {t('benefits.customizablePackagesDesc')}
            </Text>
          </View>
        </View>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightIcon}>🛡️</Text>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>{t('benefits.comprehensiveCoverage')}</Text>
            <Text style={styles.highlightDescription}>
              {t('benefits.comprehensiveCoverageDesc')}
            </Text>
          </View>
        </View>
      </View>

      {/* Base Compensation Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('benefits.compensationStructure')}</Text>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>{t('benefits.baseSurrogacyFee')}</Text>
          <Text style={styles.compensationAmount}>$60,000</Text>
        </View>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>{t('benefits.successfulTransferBonus')}</Text>
          <Text style={styles.compensationAmount}>$5,000</Text>
        </View>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>{t('benefits.pregnancyConfirmationBonus')}</Text>
          <Text style={styles.compensationAmount}>$2,000</Text>
        </View>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>{t('benefits.monthlyAllowance')}</Text>
          <Text style={styles.compensationAmount}>$200/month</Text>
        </View>
        <View style={styles.compensationItem}>
          <Text style={styles.compensationLabel}>{t('benefits.deliveryBonus')}</Text>
          <Text style={styles.compensationAmount}>$3,000</Text>
        </View>
        <View style={styles.totalCompensation}>
          <Text style={styles.totalLabel}>{t('benefits.totalEstimatedIncome')}</Text>
          <Text style={styles.totalAmount}>$70,800</Text>
        </View>
      </View>

      {/* Additional Benefits Policy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('benefits.comprehensiveBenefits')}</Text>
        
        <View style={styles.benefitCategory}>
          <Text style={styles.benefitCategoryTitle}>{t('benefits.healthcare')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.fullMedicalInsurance')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.completePrenatalCare')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.deliveryMedicalCosts')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.postpartumRecovery')}</Text>
        </View>

        <View style={styles.benefitCategory}>
          <Text style={styles.benefitCategoryTitle}>{t('benefits.lifeSupport')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.nutritionalSupplement')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.transportationReimbursement')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.psychologicalCounseling')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.legalConsultation')}</Text>
        </View>

        <View style={styles.benefitCategory}>
          <Text style={styles.benefitCategoryTitle}>{t('benefits.specialProtection')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.accidentInsurance')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.incomeLossCompensation')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.familySupport')}</Text>
          <Text style={styles.benefitItem}>{t('benefits.emergencyContact')}</Text>
        </View>
      </View>

      {/* Benefit Package PDF (admin-uploaded) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('benefits.benefitPackagePdf')}</Text>
        <Text style={styles.calculatorDescription}>
          {t('benefits.benefitPackagePdfDescription')}
        </Text>
        {benefitPdfLoading ? (
          <ActivityIndicator size="small" color="#2A7BF6" style={{ marginVertical: 12 }} />
        ) : benefitPdfUrl ? (
          <TouchableOpacity style={styles.calculatorButton} onPress={openBenefitPdf}>
            <Text style={styles.calculatorButtonText}>{t('benefits.viewBenefitPackagePdf')}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.pdfNotAvailable}>{t('benefits.benefitPackagePdfNotAvailable')}</Text>
        )}
      </View>

      {/* Payment Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('benefits.paymentSchedule')}</Text>
        <View style={styles.paymentSchedule}>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>{t('benefits.contractSigning')}</Text>
            <Text style={styles.paymentAmount}>$5,000</Text>
            <Text style={styles.paymentDescription}>{t('benefits.paidAfterSigning')}</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>{t('benefits.successfulTransfer')}</Text>
            <Text style={styles.paymentAmount}>$5,000</Text>
            <Text style={styles.paymentDescription}>{t('benefits.paidAfterTransfer')}</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>{t('benefits.pregnancyConfirmation')}</Text>
            <Text style={styles.paymentAmount}>$2,000</Text>
            <Text style={styles.paymentDescription}>{t('benefits.paidAfterPregnancy')}</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>{t('benefits.monthlyAllowancePayment')}</Text>
            <Text style={styles.paymentAmount}>$200</Text>
            <Text style={styles.paymentDescription}>{t('benefits.paidMonthly')}</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentPhase}>{t('benefits.deliveryCompletion')}</Text>
            <Text style={styles.paymentAmount}>$58,800</Text>
            <Text style={styles.paymentDescription}>{t('benefits.paidAfterDelivery')}</Text>
          </View>
        </View>
      </View>

      {/* Best Support System */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('benefits.bestSupportSystem')}</Text>
        <Text style={styles.supportDescription}>
          {t('benefits.supportDescription')}
        </Text>
        
        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>👩‍💼</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>{t('benefits.experiencedCoordinators')}</Text>
            <Text style={styles.supportDescription}>
              {t('benefits.experiencedCoordinatorsDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>⏰</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>{t('benefits.oneOnOneSupport')}</Text>
            <Text style={styles.supportDescription}>
              {t('benefits.oneOnOneSupportDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>🧠</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>{t('benefits.psychologicalSupport')}</Text>
            <Text style={styles.supportDescription}>
              {t('benefits.psychologicalSupportDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>👥</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>{t('benefits.communityPampering')}</Text>
            <Text style={styles.supportDescription}>
              {t('benefits.communityPamperingDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.supportItem}>
          <Text style={styles.supportIcon}>🔄</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>{t('benefits.flexibilityAssurance')}</Text>
            <Text style={styles.supportDescription}>
              {t('benefits.flexibilityAssuranceDesc')}
            </Text>
          </View>
        </View>
      </View>

      {/* Frequently Asked Questions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('benefits.faq')}</Text>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>{t('benefits.faqTaxes')}</Text>
          <Text style={styles.faqAnswer}>{t('benefits.faqTaxesAnswer')}</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>{t('benefits.faqPregnancyFails')}</Text>
          <Text style={styles.faqAnswer}>{t('benefits.faqPregnancyFailsAnswer')}</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>{t('benefits.faqMedicalExpenses')}</Text>
          <Text style={styles.faqAnswer}>{t('benefits.faqMedicalExpensesAnswer')}</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>{t('benefits.faqContractTermination')}</Text>
          <Text style={styles.faqAnswer}>{t('benefits.faqContractTerminationAnswer')}</Text>
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
  pdfNotAvailable: { fontSize: 14, color: '#666', fontStyle: 'italic', marginTop: 8 },
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