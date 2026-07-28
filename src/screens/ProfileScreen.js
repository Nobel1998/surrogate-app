import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Linking, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';
import { handleRateApp as openRateApp, handleRateUs as openRateUs } from '../utils/rateApp';
import { APP_DEVELOPER_NAME, APP_DISPLAY_VERSION } from '../constants/appInfo';
import { getInjectionVideoUrl } from '../constants/injectionVideos';
import {
  APPLICATION_STATUS,
  fetchLatestApplication,
  getApplicationStatusCopy,
} from '../utils/applicationStatus';

export default function ProfileScreen({ navigation }) {
  const { user, logout, deleteAccount } = useAuth();
  const { language, getLanguageLabel, t } = useLanguage();
  const [userRole, setUserRole] = useState(null);
  const [agencyRetainerDoc, setAgencyRetainerDoc] = useState(null);
  const [hipaaReleaseDoc, setHipaaReleaseDoc] = useState(null);
  const [photoReleaseDoc, setPhotoReleaseDoc] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingHipaaDoc, setLoadingHipaaDoc] = useState(false);
  const [loadingPhotoDoc, setLoadingPhotoDoc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // null = loading; APPLICATION_STATUS.* once loaded
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [intendedParentApplicationStatus, setIntendedParentApplicationStatus] = useState(null);
  const [loadingIntendedParentApplication, setLoadingIntendedParentApplication] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    loadUserRole();
  }, [user]);

  useEffect(() => {
    if (userRole !== null) {
      loadAgencyRetainerDoc();
      // Only load HIPAA Release, Photo Release, Online Claims, and Application for surrogates
      if (userRole === 'surrogate') {
        loadHipaaReleaseDoc();
        loadPhotoReleaseDoc();
        loadApplicationStatus();
      }
      // Only load Intended Parent Application for parents
      if (userRole === 'parent') {
        loadIntendedParentApplicationStatus();
      }
    }
  }, [user, userRole]);

  const loadUserRole = async () => {
    if (!user?.id) return;
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user role:', error);
        // Fallback to user.role
        setUserRole((user?.role || 'surrogate').toLowerCase());
      } else {
        setUserRole((profileData?.role || user?.role || 'surrogate').toLowerCase());
      }
    } catch (error) {
      console.error('Failed to load user role:', error);
      setUserRole((user?.role || 'surrogate').toLowerCase());
    }
  };

  const loadAgencyRetainerDoc = async () => {
    if (!user?.id) return;
    
    setLoadingDoc(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_type', 'agency_retainer')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading agency retainer doc:', error);
      } else {
        setAgencyRetainerDoc(data);
      }
    } catch (error) {
      console.error('Failed to load agency retainer doc:', error);
    } finally {
      setLoadingDoc(false);
    }
  };

  const loadHipaaReleaseDoc = async () => {
    if (!user?.id) return;
    
    setLoadingHipaaDoc(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_type', 'hipaa_release')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading HIPAA release doc:', error);
      } else {
        setHipaaReleaseDoc(data);
      }
    } catch (error) {
      console.error('Failed to load HIPAA release doc:', error);
    } finally {
      setLoadingHipaaDoc(false);
    }
  };

  const loadPhotoReleaseDoc = async () => {
    if (!user?.id) return;
    
    setLoadingPhotoDoc(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_type', 'photo_release')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading photo release doc:', error);
      } else {
        setPhotoReleaseDoc(data);
      }
    } catch (error) {
      console.error('Failed to load photo release doc:', error);
    } finally {
      setLoadingPhotoDoc(false);
    }
  };

  const loadApplicationStatus = async () => {
    if (!user?.id) {
      setApplicationStatus(APPLICATION_STATUS.NONE);
      return;
    }
    
    setLoadingApplication(true);
    try {
      const latest = await fetchLatestApplication(supabase, user.id, 'surrogate');
      setApplicationStatus(latest.id ? latest.status : APPLICATION_STATUS.NONE);
    } catch (error) {
      console.error('Failed to load application status:', error);
      setApplicationStatus(APPLICATION_STATUS.NONE);
    } finally {
      setLoadingApplication(false);
    }
  };

  const loadIntendedParentApplicationStatus = async () => {
    if (!user?.id) {
      setIntendedParentApplicationStatus(APPLICATION_STATUS.NONE);
      return;
    }
    
    setLoadingIntendedParentApplication(true);
    try {
      const latest = await fetchLatestApplication(supabase, user.id, 'parent');
      setIntendedParentApplicationStatus(latest.id ? latest.status : APPLICATION_STATUS.NONE);
    } catch (error) {
      console.error('Failed to load intended parent application status:', error);
      setIntendedParentApplicationStatus(APPLICATION_STATUS.NONE);
    } finally {
      setLoadingIntendedParentApplication(false);
    }
  };

  const handleApplicationPress = () => {
    if (applicationStatus && applicationStatus !== APPLICATION_STATUS.NONE) {
      navigation.navigate('ViewApplication');
    } else {
      navigation.navigate('SurrogateApplication');
    }
  };

  const loadIntendedParentApplication = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('common.pleaseLoginViewApplication'));
      return;
    }

    setLoadingIntendedParentApplication(true);
    try {
      const { data, error } = await supabase
        .from('intended_parent_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading intended parent application:', error);
        Alert.alert(t('common.error'), t('common.failedLoadApplication'));
        return;
      }

      if (data) {
        let formData = {};
        try {
          if (data.form_data) {
            formData = typeof data.form_data === 'string' ? JSON.parse(data.form_data) : data.form_data;
          }
        } catch (e) {
          console.error('Error parsing form_data:', e);
        }

        navigation.navigate('IntendedParentApplication', {
          editMode: true,
          applicationId: data.id,
          existingData: formData
        });
      } else {
        // No application found, navigate to create new one
        navigation.navigate('IntendedParentApplication');
      }
    } catch (error) {
      console.error('Error loading application:', error);
      Alert.alert(t('common.error'), t('common.failedLoadApplication'));
    } finally {
      setLoadingIntendedParentApplication(false);
    }
  };

  const handleIntendedParentApplicationPress = () => {
    if (intendedParentApplicationStatus && intendedParentApplicationStatus !== APPLICATION_STATUS.NONE) {
      navigation.navigate('ViewApplication');
    } else {
      navigation.navigate('IntendedParentApplication');
    }
  };

  const handleHipaaReleasePress = async () => {
    if (loadingHipaaDoc) return;
    
    if (!hipaaReleaseDoc || !hipaaReleaseDoc.file_url) {
      Alert.alert(
        t('documents.noDocument'),
        t('documents.notUploaded', { document: t('profile.hipaaRelease') })
      );
      return;
    }

    try {
      const url = hipaaReleaseDoc.file_url;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('documents.cannotOpen'));
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert(t('common.error'), t('documents.openError'));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh all data that might have changed
      const refreshPromises = [loadAgencyRetainerDoc()];
      
      if (userRole === 'surrogate') {
        refreshPromises.push(loadHipaaReleaseDoc(), loadPhotoReleaseDoc(), loadApplicationStatus());
      }
      
      if (userRole === 'parent') {
        refreshPromises.push(loadIntendedParentApplicationStatus());
      }
      
      await Promise.all(refreshPromises);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAgencyRetainerPress = async () => {
    if (loadingDoc) return;
    
    if (!agencyRetainerDoc || !agencyRetainerDoc.file_url) {
      Alert.alert(
        t('documents.noDocument'),
        t('documents.notUploaded', { document: t('profile.agencyRetainer') })
      );
      return;
    }

    try {
      const url = agencyRetainerDoc.file_url;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('documents.cannotOpen'));
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert(t('common.error'), t('documents.openError'));
    }
  };

  const handlePhotoReleasePress = async () => {
    if (loadingPhotoDoc) return;
    
    if (!photoReleaseDoc || !photoReleaseDoc.file_url) {
      Alert.alert(
        t('documents.noDocument'),
        t('documents.notUploaded', { document: t('profile.photoRelease') })
      );
      return;
    }

    try {
      const url = photoReleaseDoc.file_url;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('documents.cannotOpen'));
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert(t('common.error'), t('documents.openError'));
    }
  };

  const handleOnlineClaimsPress = () => {
    navigation.navigate('OnlineClaims');
  };

  const handleRateApp = () => openRateApp(t);
  const handleRateUs = () => openRateUs(t);

  const handleInjectionVideos = async () => {
    const url = getInjectionVideoUrl(language);
    try {
      const isHttp = /^https?:\/\//i.test(url);
      const supported = isHttp ? true : await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('common.error'), t('profile.injectionVideosError'));
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening injection videos:', error);
      Alert.alert(t('common.error'), t('profile.injectionVideosError'));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.confirmSignOutTitle'),
      t('profile.confirmSignOutMessage'),
      [
        { text: t('profile.deleteAccountCancel'), style: 'cancel' },
        { 
          text: t('profile.signOut'), 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Starting logout process...');
              await logout();
              console.log('✅ Logout completed successfully');
            } catch (error) {
              console.error('❌ Logout failed:', error);
              Alert.alert(t('common.logoutError'), t('common.logoutErrorMessage'));
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountStep1Title'),
      t('profile.deleteAccountStep1Message'),
      [
        { text: t('profile.deleteAccountCancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccountContinue'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('profile.deleteAccountStep2Title'),
              t('profile.deleteAccountStep2Message'),
              [
                { text: t('profile.deleteAccountCancel'), style: 'cancel' },
                {
                  text: t('profile.deleteAccountSubmit'),
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      const result = await deleteAccount();
                      if (!result.success) {
                        const errStr = String(result.error || '');
                        const isUnavailable =
                          errStr.includes('Failed to send a request') ||
                          errStr.includes('FunctionsRelayError') ||
                          errStr.includes('Failed to fetch');
                        const msg = isUnavailable
                          ? t('profile.deleteAccountFailedUnavailable')
                          : errStr && errStr !== 'delete_failed'
                            ? errStr
                            : t('profile.deleteAccountFailed');
                        Alert.alert(t('profile.deleteAccountStep2Title'), msg);
                      }
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderHeaderButton = (icon, label, onPress, color) => (
    <TouchableOpacity style={styles.headerButton} onPress={onPress}>
      <View style={[styles.headerIconContainer, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color="#fff" />
      </View>
      <Text style={styles.headerButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderMenuItem = (label, icon, onPress, iconColor = '#333', value = null, showLoading = false) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={showLoading}>
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={20} color={iconColor} style={styles.menuIcon} />
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {showLoading ? (
          <ActivityIndicator size="small" color="#999" />
        ) : (
          <>
            {value && <Text style={styles.menuItemValue}>{value}</Text>}
            <Icon name="chevron-right" size={20} color="#CCC" />
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not logged in</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* User Info Header - Simplified */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>
      </View>

      {/* Top Action Bar (FAQ, Customer Service, About Us) */}
      <View style={styles.topActionBar}>
        {renderHeaderButton('help-circle', t('profile.faq'), () => navigation.navigate('FAQ'), '#9C27B0')}
        {renderHeaderButton('message-circle', t('profile.customerService'), () => navigation.navigate('CustomerService'), '#9C27B0')}
        {renderHeaderButton('info', t('profile.aboutUs'), () => navigation.navigate('Company'), '#9C27B0')}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2A7BF6"
            colors={['#2A7BF6']}
          />
        }
      >
        {/* Section 1 */}
        <View style={styles.section}>
          {renderMenuItem(t('profile.myInfo'), 'tag', () => navigation.navigate('MyInfo'), '#FF9800')}
          {renderMenuItem(
            t('profile.agencyRetainer'),
            'file-text',
            handleAgencyRetainerPress,
            '#666',
            agencyRetainerDoc ? t('profile.available') : t('profile.notAvailable'),
            loadingDoc
          )}
          {/* Only show HIPAA Release and Photo Release for surrogates */}
          {userRole === 'surrogate' && (
            <>
              {renderMenuItem(
                t('profile.hipaaRelease'),
                'shield',
                handleHipaaReleasePress,
                '#333',
                hipaaReleaseDoc ? t('profile.available') : t('profile.notAvailable'),
                loadingHipaaDoc
              )}
              {renderMenuItem(
                t('profile.photoRelease'),
                'camera',
                handlePhotoReleasePress,
                '#333',
                photoReleaseDoc ? t('profile.available') : t('profile.notAvailable'),
                loadingPhotoDoc
              )}
              {renderMenuItem(
                t('myMatch.onlineClaims'),
                'check-circle',
                handleOnlineClaimsPress,
                '#6C5CE7',
                t('profile.submitAndViewClaims')
              )}
            </>
          )}
          {/* Only show Intended Parent Application for parents */}
          {userRole === 'parent' && (
            <>
              {renderMenuItem(
                intendedParentApplicationStatus && intendedParentApplicationStatus !== APPLICATION_STATUS.NONE
                  ? t('profile.viewApplication')
                  : t('profile.submitApplication'),
                intendedParentApplicationStatus && intendedParentApplicationStatus !== APPLICATION_STATUS.NONE
                  ? 'file-text'
                  : 'edit-3',
                handleIntendedParentApplicationPress,
                getApplicationStatusCopy('parent', intendedParentApplicationStatus, t).badgeColor,
                getApplicationStatusCopy('parent', intendedParentApplicationStatus, t).badge,
                loadingIntendedParentApplication
              )}
            </>
          )}
          {/* Only show Application, Benefit Package, and Injection Tutorial Videos for surrogates */}
          {userRole === 'surrogate' && (
            <>
              {renderMenuItem(
                applicationStatus && applicationStatus !== APPLICATION_STATUS.NONE
                  ? t('profile.viewApplication')
                  : t('profile.submitApplication'),
                applicationStatus && applicationStatus !== APPLICATION_STATUS.NONE
                  ? 'file-text'
                  : 'edit-3',
                handleApplicationPress,
                getApplicationStatusCopy('surrogate', applicationStatus, t).badgeColor,
                getApplicationStatusCopy('surrogate', applicationStatus, t).badge,
                loadingApplication
              )}
              {renderMenuItem(t('profile.benefitPackage'), 'gift', () => navigation.navigate('Benefits'), '#333')}
              {renderMenuItem(t('profile.injectionVideos'), 'play-circle', handleInjectionVideos, '#FFC107')}
            </>
          )}
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          {renderMenuItem(
            t('profile.language'),
            'globe',
            () => navigation.navigate('Language'),
            '#FF9800',
            getLanguageLabel(language)
          )}
          {renderMenuItem(t('profile.refer'), 'user-plus', () => navigation.navigate('Ambassador'), '#9C27B0')}
          {renderMenuItem(t('profile.rateApp'), 'star', handleRateApp, '#4CAF50')}
          {renderMenuItem(t('profile.rateUs'), 'thumbs-up', handleRateUs, '#FF9800')}
          {renderMenuItem(t('profile.contactUs'), 'phone', () => navigation.navigate('ContactUs'), '#4CAF50')}
          {renderMenuItem(
            t('profile.aboutApp'),
            'info',
            () =>
              Alert.alert(
                t('profile.aboutApp'),
                t('common.aboutAppMessage', {
                  version: APP_DISPLAY_VERSION,
                  developer: APP_DEVELOPER_NAME,
                })
              ),
            '#2196F3'
          )}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, styles.deleteAccountButton]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator color="#B71C1C" />
          ) : (
            <Text style={styles.deleteAccountButtonText}>{t('profile.deleteAccount')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60, // Safe area
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A7BF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  topActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 10,
    paddingVertical: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemValue: {
    fontSize: 14,
    color: '#999',
    marginRight: 8,
  },
  deleteAccountButton: {
    marginTop: 20,
    marginBottom: 0,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  deleteAccountButtonText: {
    color: '#B71C1C',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginBottom: 40,
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  logoutButtonText: {
    color: '#DC3545',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginTop: 50,
  },
});