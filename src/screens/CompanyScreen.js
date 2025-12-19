import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Image, Dimensions } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CompanyScreen() {
  const { t } = useLanguage();
  const openWebsite = () => {
    Linking.openURL('https://babytreesurrogacy.com/');
  };

  const openEmail = () => {
    Linking.openURL('mailto:info@usababytree.com');
  };

  const openPhone = () => {
    Linking.openURL('tel:+1-888-245-1866');
  };

  const openAddress = () => {
    Linking.openURL('https://maps.google.com/?q=961+W+Holt+Blvd,+Ontario,+CA+91762');
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      {/* Company Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>SA</Text>
          </View>
        </View>
        <Text style={styles.title}>{t('company.title')}</Text>
        <Text style={styles.subtitle}>{t('company.subtitle')}</Text>
      </View>

      {/* Company Introduction */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('company.aboutOurCompany')}</Text>
        <Text style={styles.introText}>
          {t('company.introText1')}
        </Text>
        <Text style={styles.introText}>
          {t('company.introText2')}
        </Text>
      </View>

      {/* Company Website */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('company.companyWebsite')}</Text>
        <Text style={styles.websiteDescription}>
          {t('company.websiteDescription')}
        </Text>
        <TouchableOpacity style={styles.websiteButton} onPress={openWebsite}>
          <Text style={styles.websiteButtonText}>{t('company.visitOfficialWebsite')}</Text>
        </TouchableOpacity>
        <Text style={styles.websiteUrl}>babytreesurrogacy.com</Text>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('company.contactInformation')}</Text>
        
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📞</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>{t('company.phone')}</Text>
            <TouchableOpacity onPress={openPhone}>
              <Text style={styles.contactValue}>(888) 245-1866</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📧</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>{t('company.email')}</Text>
            <TouchableOpacity onPress={openEmail}>
              <Text style={styles.contactValue}>info@usababytree.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📍</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>{t('company.address')}</Text>
            <TouchableOpacity onPress={openAddress}>
              <Text style={styles.contactValue}>961 W Holt Blvd{'\n'}Ontario, CA 91762</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>🕒</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>{t('company.businessHours')}</Text>
            <Text style={styles.contactValue}>{t('company.businessHoursWeekday')}{'\n'}{t('company.businessHoursSaturday')}</Text>
          </View>
        </View>
      </View>

      {/* Certifications & Credentials */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('company.certifications')}</Text>
        
        <View style={styles.certificationItem}>
          <Text style={styles.certificationIcon}>✅</Text>
          <View style={styles.certificationContent}>
            <Text style={styles.certificationTitle}>{t('company.licensedSurrogacyAgency')}</Text>
            <Text style={styles.certificationDescription}>
              {t('company.licensedBy')}
            </Text>
            <Text style={styles.certificationDate}>{t('company.licenseNumber')}</Text>
          </View>
        </View>

        <View style={styles.certificationItem}>
          <Text style={styles.certificationIcon}>✅</Text>
          <View style={styles.certificationContent}>
            <Text style={styles.certificationTitle}>{t('company.asrmMember')}</Text>
            <Text style={styles.certificationDescription}>
              {t('company.asrmDescription')}
            </Text>
            <Text style={styles.certificationDate}>{t('company.memberSince')}</Text>
          </View>
        </View>

        <View style={styles.certificationItem}>
          <Text style={styles.certificationIcon}>✅</Text>
          <View style={styles.certificationContent}>
            <Text style={styles.certificationTitle}>{t('company.hipaaCompliant')}</Text>
            <Text style={styles.certificationDescription}>
              {t('company.hipaaDescription')}
            </Text>
            <Text style={styles.certificationDate}>{t('company.certified')}</Text>
          </View>
        </View>


        <View style={styles.certificationItem}>
          <Text style={styles.certificationIcon}>✅</Text>
          <View style={styles.certificationContent}>
            <Text style={styles.certificationTitle}>{t('company.internationalSurrogacyNetwork')}</Text>
            <Text style={styles.certificationDescription}>
              {t('company.isnDescription')}
            </Text>
            <Text style={styles.certificationDate}>{t('company.isnMemberSince')}</Text>
          </View>
        </View>
      </View>

      {/* Company Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('company.companyStatistics')}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1,000+</Text>
            <Text style={styles.statLabel}>{t('company.successfulJourneys')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>14+</Text>
            <Text style={styles.statLabel}>{t('company.yearsExperience')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statLabel}>{t('company.successRate')}</Text>
          </View>
        </View>
      </View>

      {/* Mission Statement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('company.ourMission')}</Text>
        <View style={styles.missionContainer}>
          <Text style={styles.missionText}>
            {t('company.missionText')}
          </Text>
        </View>
      </View>

      {/* Emergency Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('company.emergencyContact')}</Text>
        <Text style={styles.emergencyDescription}>
          {t('company.emergencyDescription')}
        </Text>
        <TouchableOpacity style={styles.emergencyButton} onPress={() => Linking.openURL('tel:+1-888-245-1866')}>
          <Text style={styles.emergencyButtonText}>{t('company.emergencyHotline')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 60,
  },
  header: {
    backgroundColor: '#2A7BF6',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoText: {
    color: '#2A7BF6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F4FD',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'visible',
    alignSelf: 'stretch',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A7BF6',
    marginBottom: 16,
  },
  introText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  websiteDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  websiteButton: {
    backgroundColor: '#2A7BF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  websiteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  websiteUrl: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: '#2A7BF6',
    lineHeight: 22,
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  certificationIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  certificationContent: {
    flex: 1,
  },
  certificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  certificationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  certificationDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A7BF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  missionContainer: {
    width: '100%',
    flexShrink: 1,
  },
  missionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  emergencyDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  emergencyButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});