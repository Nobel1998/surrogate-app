import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useLanguage } from '../context/LanguageContext';

export default function IntendedParentsProfileScreen({ route, navigation }) {
  const { profile, application } = route?.params || {};
  const { t } = useLanguage();
  
  // Determine profile type based on role
  const profileRole = (profile?.role || '').toLowerCase();
  const isSurrogate = profileRole === 'surrogate';
  const isParent = profileRole === 'parent';
  const profileTitle = isSurrogate ? t('profileDetail.surrogateProfile') : isParent ? t('profileDetail.intendedParentsProfile') : t('profileDetail.partnerProfile');
  const profileRoleLabel = isSurrogate ? t('profileDetail.surrogate') : isParent ? t('profileDetail.intendedParent') : t('profileDetail.partner');
  
  // Get parsed application data
  const appData = application?.parsedFormData || {};

  // Function to translate English option values to current language
  const translateValue = (value, fieldType) => {
    if (!value) return value;
    
    // If value is not a string, return as is
    if (typeof value !== 'string') return value;
    
    // Trim the value
    const trimmedValue = value.trim();
    
    // Map English values to translation keys (exact matches)
    const valueMap = {
      // Smoking status
      'Non-smoker': t('application.nonSmoker'),
      'Former smoker': t('application.formerSmoker'),
      'Current smoker': t('application.currentSmoker'),
      // Employment status
      'Employed Full-time': t('application.employedFullTime'),
      'Employed Part-time': t('application.employedPartTime'),
      'Self-employed': t('application.selfEmployed'),
      'Unemployed': t('application.unemployed'),
      'Student': t('application.student'),
      // Common phrases and words
      'Pregnancy': t('profileDetail.previousPregnancies'),
      'Current': t('application.currentSmoker'),
      'Previous': t('profileDetail.previousPregnancies'),
      'Previous Pregnancy': t('profileDetail.previousPregnancies'),
      'Previous Pregnancies': t('profileDetail.previousPregnancies'),
      'Current Medications': t('profileDetail.currentMedications'),
      'Current Medication': t('profileDetail.currentMedications'),
      // Common phrases for alcohol usage and exercise
      'Every Week': t('profileDetail.everyWeek'),
      'Every week': t('profileDetail.everyWeek'),
      'every week': t('profileDetail.everyWeek'),
      'Everyday': t('profileDetail.everyday'),
      'Every day': t('profileDetail.everyday'),
      'everyday': t('profileDetail.everyday'),
      'every day': t('profileDetail.everyday'),
      // Common single words
      'Asia': t('profileDetail.asia'),
      'Asian': t('profileDetail.asian'),
      'Health': t('profileDetail.health'),
      'Family': t('profileDetail.family'),
      'Insurance': t('profileDetail.insurance'),
      'Stable': t('profileDetail.stable'),
      'Special': t('profileDetail.special'),
      'Good': t('profileDetail.good'),
      'Explain': t('profileDetail.explain'),
    };
    
    // Check for exact match first (case-sensitive)
    if (valueMap[trimmedValue]) {
      return valueMap[trimmedValue];
    }
    
    // Check for case-insensitive match
    const lowerValue = trimmedValue.toLowerCase();
    const caseInsensitiveMap = {
      'non-smoker': t('application.nonSmoker'),
      'former smoker': t('application.formerSmoker'),
      'current smoker': t('application.currentSmoker'),
      'employed full-time': t('application.employedFullTime'),
      'employed part-time': t('application.employedPartTime'),
      'self-employed': t('application.selfEmployed'),
      'unemployed': t('application.unemployed'),
      'student': t('application.student'),
      'pregnancy': t('profileDetail.previousPregnancies'),
      'current': t('application.currentSmoker'),
      'previous': t('profileDetail.previousPregnancies'),
      'previous pregnancy': t('profileDetail.previousPregnancies'),
      'previous pregnancies': t('profileDetail.previousPregnancies'),
      'current medications': t('profileDetail.currentMedications'),
      'current medication': t('profileDetail.currentMedications'),
      'every week': t('profileDetail.everyWeek'),
      'everyday': t('profileDetail.everyday'),
      'every day': t('profileDetail.everyday'),
      // Common single words (lowercase)
      'asia': t('profileDetail.asia'),
      'asian': t('profileDetail.asian'),
      'health': t('profileDetail.health'),
      'family': t('profileDetail.family'),
      'insurance': t('profileDetail.insurance'),
      'stable': t('profileDetail.stable'),
      'special': t('profileDetail.special'),
      'good': t('profileDetail.good'),
      'explain': t('profileDetail.explain'),
    };
    
    if (caseInsensitiveMap[lowerValue]) {
      return caseInsensitiveMap[lowerValue];
    }
    
    // For values that might contain English words, try to translate common patterns
    let translatedValue = trimmedValue;
    
    // Common word replacements (case-insensitive, whole word matching where possible)
    const wordReplacements = [
      { pattern: /\bPregnancy\b/gi, replacement: t('profileDetail.previousPregnancies') },
      { pattern: /\bCurrent\b/gi, replacement: t('application.currentSmoker') },
      { pattern: /\bPrevious\b/gi, replacement: t('profileDetail.previousPregnancies') },
      { pattern: /\bEvery Week\b/gi, replacement: t('profileDetail.everyWeek') },
      { pattern: /\bEveryday\b/gi, replacement: t('profileDetail.everyday') },
      { pattern: /\bEvery day\b/gi, replacement: t('profileDetail.everyday') },
      { pattern: /\bAsia\b/gi, replacement: t('profileDetail.asia') },
      { pattern: /\bAsian\b/gi, replacement: t('profileDetail.asian') },
      { pattern: /\bHealth\b/gi, replacement: t('profileDetail.health') },
      { pattern: /\bFamily\b/gi, replacement: t('profileDetail.family') },
      { pattern: /\bInsurance\b/gi, replacement: t('profileDetail.insurance') },
      { pattern: /\bStable\b/gi, replacement: t('profileDetail.stable') },
      { pattern: /\bSpecial\b/gi, replacement: t('profileDetail.special') },
      { pattern: /\bGood\b/gi, replacement: t('profileDetail.good') },
      { pattern: /\bExplain\b/gi, replacement: t('profileDetail.explain') },
    ];
    
    // Apply replacements
    wordReplacements.forEach(({ pattern, replacement }) => {
      translatedValue = translatedValue.replace(pattern, replacement);
    });
    
    return translatedValue;
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color="#1A1D1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{profileTitle}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('profileDetail.profileNotAvailable')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderInfoRow = (label, value, icon, onPress = null) => {
    if (!value) return null;
    
    const content = (
      <View style={styles.infoRow}>
        <View style={styles.infoRowLeft}>
          <View style={styles.infoIconContainer}>
            <Icon name={icon} size={20} color="#FF8EA4" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        </View>
        {onPress && (
          <TouchableOpacity onPress={onPress} style={styles.actionButton}>
            <Icon name="external-link" size={18} color="#FF8EA4" />
          </TouchableOpacity>
        )}
      </View>
    );

    return content;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitleWhite}>{profileTitle}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Avatar name={profile.name || (isSurrogate ? t('profileDetail.surrogate') : t('profileDetail.intendedParent'))} size={100} />
            </View>
            <Text style={styles.profileName}>{profile.name || (isSurrogate ? t('profileDetail.surrogate') : t('profileDetail.intendedParent'))}</Text>
            <Text style={styles.profileRole}>{profileRoleLabel}</Text>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profileDetail.contactInformation')}</Text>
            
            {renderInfoRow(
              t('profileDetail.email'),
              profile.email,
              'mail',
              profile.email ? () => Linking.openURL(`mailto:${profile.email}`) : null
            )}
            
            {renderInfoRow(
              t('profileDetail.phone'),
              profile.phone,
              'phone',
              profile.phone ? () => Linking.openURL(`tel:${profile.phone}`) : null
            )}
            
            {renderInfoRow(
              t('profileDetail.location'),
              profile.location,
              'map-pin',
              null
            )}
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profileDetail.personalInformation')}</Text>
            
            {renderInfoRow(
              t('profileDetail.fullLegalName'),
              appData.fullName || application?.full_name || profile.name,
              'user',
              null
            )}
            
            {renderInfoRow(
              t('profileDetail.age'),
              appData.age,
              'calendar',
              null
            )}
            
            {renderInfoRow(
              t('profileDetail.dateOfBirth'),
              appData.dateOfBirth || profile.date_of_birth,
              'calendar',
              null
            )}
            
            {renderInfoRow(
              t('profileDetail.raceEthnicity'),
              translateValue(appData.race || profile.race, 'race'),
              'user',
              null
            )}
            
            {renderInfoRow(
              t('profileDetail.location'),
              appData.location || profile.location || profile.address,
              'map-pin',
              null
            )}
            
            {renderInfoRow(
              t('profileDetail.howDidYouHearAboutUs'),
              appData.hearAboutUs,
              'info',
              null
            )}
          </View>

          {/* Medical Information */}
          {appData.previousPregnancies || appData.previousSurrogacy !== undefined || appData.pregnancyComplications || appData.currentMedications || appData.healthConditions || appData.bmi ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profileDetail.medicalInformation')}</Text>
              
              {renderInfoRow(
                t('profileDetail.previousPregnancies'),
                translateValue(appData.previousPregnancies, 'previousPregnancies'),
                'heart',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.previousSurrogacyExperience'),
                appData.previousSurrogacy === true ? t('profileDetail.yes') : appData.previousSurrogacy === false ? t('profileDetail.no') : null,
                'check-circle',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.pregnancyComplications'),
                translateValue(appData.pregnancyComplications, 'pregnancyComplications'),
                'alert-circle',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.currentMedications'),
                translateValue(appData.currentMedications, 'currentMedications'),
                'pill',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.healthConditions'),
                translateValue(appData.healthConditions, 'healthConditions'),
                'activity',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.bmi'),
                translateValue(appData.bmi, 'bmi'),
                'trending-up',
                null
              )}
            </View>
          ) : null}

          {/* Lifestyle Information */}
          {appData.smokingStatus || appData.alcoholUsage || appData.exerciseRoutine || appData.employmentStatus || appData.supportSystem ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profileDetail.lifestyleInformation')}</Text>
              
              {renderInfoRow(
                t('profileDetail.smokingStatus'),
                translateValue(appData.smokingStatus, 'smokingStatus'),
                'wind',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.alcoholUsage'),
                translateValue(appData.alcoholUsage, 'alcoholUsage'),
                'droplet',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.exerciseRoutine'),
                translateValue(appData.exerciseRoutine, 'exerciseRoutine'),
                'activity',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.employmentStatus'),
                translateValue(appData.employmentStatus, 'employmentStatus'),
                'briefcase',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.supportSystem'),
                translateValue(appData.supportSystem, 'supportSystem'),
                'users',
                null
              )}
            </View>
          ) : null}

          {/* Legal & Background Information */}
          {appData.criminalBackground !== undefined || appData.legalIssues || appData.insuranceCoverage || appData.financialStability ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profileDetail.legalBackgroundInformation')}</Text>
              
              {renderInfoRow(
                t('profileDetail.criminalBackground'),
                appData.criminalBackground === true ? t('profileDetail.yes') : appData.criminalBackground === false ? t('profileDetail.no') : null,
                'shield',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.legalIssues'),
                translateValue(appData.legalIssues, 'legalIssues'),
                'file-text',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.insuranceCoverage'),
                translateValue(appData.insuranceCoverage, 'insuranceCoverage'),
                'shield',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.financialStability'),
                translateValue(appData.financialStability, 'financialStability'),
                'dollar-sign',
                null
              )}
            </View>
          ) : null}

          {/* Preferences & Additional Information */}
          {appData.compensationExpectations || appData.timelineAvailability || appData.travelWillingness !== undefined || appData.specialPreferences || appData.additionalComments ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profileDetail.preferencesAdditionalInformation')}</Text>
              
              {renderInfoRow(
                t('profileDetail.compensationExpectations'),
                translateValue(appData.compensationExpectations, 'compensationExpectations'),
                'dollar-sign',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.timelineAvailability'),
                translateValue(appData.timelineAvailability, 'timelineAvailability'),
                'calendar',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.travelWillingness'),
                appData.travelWillingness === true ? t('profileDetail.yes') : appData.travelWillingness === false ? t('profileDetail.no') : null,
                'map',
                null
              )}
              
              {renderInfoRow(
                t('profileDetail.specialPreferences'),
                translateValue(appData.specialPreferences, 'specialPreferences'),
                'star',
                null
              )}
              
              {appData.additionalComments ? (
                <View style={styles.notesContainer}>
                  <View style={styles.infoRowLeft}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="file-text" size={20} color="#FF8EA4" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>{t('profileDetail.additionalComments')}</Text>
                      <Text style={styles.infoValue}>{translateValue(appData.additionalComments, 'additionalComments')}</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Additional Information */}
          {(profile.address || profile.notes) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profileDetail.additionalInformation')}</Text>
              
              {renderInfoRow(
                t('profileDetail.address'),
                profile.address,
                'home',
                null
              )}
              
              {profile.notes && (
                <View style={styles.notesContainer}>
                  <View style={styles.infoRowLeft}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="file-text" size={20} color="#FF8EA4" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>{t('profileDetail.notes')}</Text>
                      <Text style={styles.infoValue}>{profile.notes}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>{t('profileDetail.quickActions')}</Text>
            <View style={styles.quickActionsGrid}>
              {profile.phone && (
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => Linking.openURL(`tel:${profile.phone}`)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="phone" size={24} color="#00B894" />
                  </View>
                  <Text style={styles.quickActionLabel}>{t('profileDetail.call')}</Text>
                </TouchableOpacity>
              )}

              {profile.email && (
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => Linking.openURL(`mailto:${profile.email}`)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Icon name="mail" size={24} color="#FF8EA4" />
                  </View>
                  <Text style={styles.quickActionLabel}>{t('profileDetail.email')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  headerGradient: {
    backgroundColor: '#FF8EA4',
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#FF8EA4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  headerTitleWhite: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D1E',
  },
  actionButton: {
    padding: 8,
  },
  notesContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  quickActionsSection: {
    marginTop: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D1E',
  },
});

