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

export default function IntendedParentsProfileScreen({ route, navigation }) {
  const { profile, application } = route?.params || {};
  
  // Determine profile type based on role
  const profileRole = (profile?.role || '').toLowerCase();
  const isSurrogate = profileRole === 'surrogate';
  const isParent = profileRole === 'parent';
  const profileTitle = isSurrogate ? 'Surrogate Profile' : isParent ? 'Intended Parents Profile' : 'Partner Profile';
  const profileRoleLabel = isSurrogate ? 'Surrogate' : isParent ? 'Intended Parent' : 'Partner';
  
  // Get parsed application data
  const appData = application?.parsedFormData || {};

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
          <Text style={styles.emptyText}>Profile information not available</Text>
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
              <Avatar name={profile.name || (isSurrogate ? 'Surrogate' : 'Parent')} size={100} />
            </View>
            <Text style={styles.profileName}>{profile.name || (isSurrogate ? 'Surrogate' : 'Parent')}</Text>
            <Text style={styles.profileRole}>{profileRoleLabel}</Text>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {renderInfoRow(
              'Email',
              profile.email,
              'mail',
              profile.email ? () => Linking.openURL(`mailto:${profile.email}`) : null
            )}
            
            {renderInfoRow(
              'Phone',
              profile.phone,
              'phone',
              profile.phone ? () => Linking.openURL(`tel:${profile.phone}`) : null
            )}
            
            {renderInfoRow(
              'Location',
              profile.location,
              'map-pin',
              null
            )}
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {renderInfoRow(
              'Full Legal Name',
              appData.fullName || application?.full_name || profile.name,
              'user',
              null
            )}
            
            {renderInfoRow(
              'Age',
              appData.age,
              'calendar',
              null
            )}
            
            {renderInfoRow(
              'Date of Birth',
              appData.dateOfBirth || profile.date_of_birth,
              'calendar',
              null
            )}
            
            {renderInfoRow(
              'Race/Ethnicity',
              appData.race || profile.race,
              'user',
              null
            )}
            
            {renderInfoRow(
              'Location',
              appData.location || profile.location || profile.address,
              'map-pin',
              null
            )}
            
            {renderInfoRow(
              'How did you hear about us?',
              appData.hearAboutUs,
              'info',
              null
            )}
          </View>

          {/* Medical Information */}
          {appData.previousPregnancies || appData.previousSurrogacy !== undefined || appData.pregnancyComplications || appData.currentMedications || appData.healthConditions || appData.bmi ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medical Information</Text>
              
              {renderInfoRow(
                'Previous Pregnancies',
                appData.previousPregnancies,
                'heart',
                null
              )}
              
              {renderInfoRow(
                'Previous Surrogacy Experience',
                appData.previousSurrogacy === true ? 'Yes' : appData.previousSurrogacy === false ? 'No' : null,
                'check-circle',
                null
              )}
              
              {renderInfoRow(
                'Pregnancy Complications',
                appData.pregnancyComplications,
                'alert-circle',
                null
              )}
              
              {renderInfoRow(
                'Current Medications',
                appData.currentMedications,
                'pill',
                null
              )}
              
              {renderInfoRow(
                'Health Conditions',
                appData.healthConditions,
                'activity',
                null
              )}
              
              {renderInfoRow(
                'BMI',
                appData.bmi,
                'trending-up',
                null
              )}
            </View>
          ) : null}

          {/* Lifestyle Information */}
          {appData.smokingStatus || appData.alcoholUsage || appData.exerciseRoutine || appData.employmentStatus || appData.supportSystem ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lifestyle Information</Text>
              
              {renderInfoRow(
                'Smoking Status',
                appData.smokingStatus,
                'wind',
                null
              )}
              
              {renderInfoRow(
                'Alcohol Usage',
                appData.alcoholUsage,
                'droplet',
                null
              )}
              
              {renderInfoRow(
                'Exercise Routine',
                appData.exerciseRoutine,
                'activity',
                null
              )}
              
              {renderInfoRow(
                'Employment Status',
                appData.employmentStatus,
                'briefcase',
                null
              )}
              
              {renderInfoRow(
                'Support System',
                appData.supportSystem,
                'users',
                null
              )}
            </View>
          ) : null}

          {/* Legal & Background Information */}
          {appData.criminalBackground !== undefined || appData.legalIssues || appData.insuranceCoverage || appData.financialStability ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Legal & Background Information</Text>
              
              {renderInfoRow(
                'Criminal Background',
                appData.criminalBackground === true ? 'Yes' : appData.criminalBackground === false ? 'No' : null,
                'shield',
                null
              )}
              
              {renderInfoRow(
                'Legal Issues',
                appData.legalIssues,
                'file-text',
                null
              )}
              
              {renderInfoRow(
                'Insurance Coverage',
                appData.insuranceCoverage,
                'shield',
                null
              )}
              
              {renderInfoRow(
                'Financial Stability',
                appData.financialStability,
                'dollar-sign',
                null
              )}
            </View>
          ) : null}

          {/* Preferences & Additional Information */}
          {appData.compensationExpectations || appData.timelineAvailability || appData.travelWillingness !== undefined || appData.specialPreferences || appData.additionalComments ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences & Additional Information</Text>
              
              {renderInfoRow(
                'Compensation Expectations',
                appData.compensationExpectations,
                'dollar-sign',
                null
              )}
              
              {renderInfoRow(
                'Timeline Availability',
                appData.timelineAvailability,
                'calendar',
                null
              )}
              
              {renderInfoRow(
                'Travel Willingness',
                appData.travelWillingness === true ? 'Yes' : appData.travelWillingness === false ? 'No' : null,
                'map',
                null
              )}
              
              {renderInfoRow(
                'Special Preferences',
                appData.specialPreferences,
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
                      <Text style={styles.infoLabel}>Additional Comments</Text>
                      <Text style={styles.infoValue}>{appData.additionalComments}</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Additional Information */}
          {(profile.address || profile.notes) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              
              {renderInfoRow(
                'Address',
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
                      <Text style={styles.infoLabel}>Notes</Text>
                      <Text style={styles.infoValue}>{profile.notes}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {profile.phone && (
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => Linking.openURL(`tel:${profile.phone}`)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="phone" size={24} color="#00B894" />
                  </View>
                  <Text style={styles.quickActionLabel}>Call</Text>
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
                  <Text style={styles.quickActionLabel}>Email</Text>
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

