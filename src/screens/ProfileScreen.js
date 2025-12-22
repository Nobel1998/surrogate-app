import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Linking, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { language, getLanguageLabel, t } = useLanguage();
  const [userRole, setUserRole] = useState(null);
  const [agencyRetainerDoc, setAgencyRetainerDoc] = useState(null);
  const [hipaaReleaseDoc, setHipaaReleaseDoc] = useState(null);
  const [photoReleaseDoc, setPhotoReleaseDoc] = useState(null);
  const [trustAccountDoc, setTrustAccountDoc] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingHipaaDoc, setLoadingHipaaDoc] = useState(false);
  const [loadingPhotoDoc, setLoadingPhotoDoc] = useState(false);
  const [loadingTrustAccountDoc, setLoadingTrustAccountDoc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserRole();
  }, [user]);

  useEffect(() => {
    if (userRole !== null) {
      loadAgencyRetainerDoc();
      // Only load HIPAA Release and Photo Release for surrogates
      if (userRole === 'surrogate') {
        loadHipaaReleaseDoc();
        loadPhotoReleaseDoc();
      }
      // Only load Trust Account for parents
      if (userRole === 'parent') {
        loadTrustAccountDoc();
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

  const loadTrustAccountDoc = async () => {
    if (!user?.id) return;
    
    setLoadingTrustAccountDoc(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_type', 'trust_account')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading trust account doc:', error);
      } else {
        setTrustAccountDoc(data);
      }
    } catch (error) {
      console.error('Failed to load trust account doc:', error);
    } finally {
      setLoadingTrustAccountDoc(false);
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
        refreshPromises.push(loadHipaaReleaseDoc(), loadPhotoReleaseDoc());
      }
      
      if (userRole === 'parent') {
        refreshPromises.push(loadTrustAccountDoc());
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

  const handleTrustAccountPress = async () => {
    if (loadingTrustAccountDoc) return;
    
    if (!trustAccountDoc || !trustAccountDoc.file_url) {
      Alert.alert(
        t('documents.noDocument'),
        t('documents.notUploaded', { document: 'Trust Account' })
      );
      return;
    }

    try {
      const url = trustAccountDoc.file_url;
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

  const handleRateApp = async () => {
    console.log('⭐ [Rate App] handleRateApp called');
    
    try {
      console.log('⭐ [Rate App] Checking StoreReview availability...');
      console.log('⭐ [Rate App] StoreReview object:', StoreReview ? 'exists' : 'null/undefined');
      console.log('⭐ [Rate App] StoreReview.hasAction type:', typeof StoreReview?.hasAction);
      
      // Check if StoreReview is available (may not be available if app is not published)
      if (!StoreReview || typeof StoreReview.hasAction !== 'function') {
        console.log('⚠️ [Rate App] StoreReview not available or hasAction is not a function');
        console.log('⚠️ [Rate App] Showing unpublished app message');
        // App is not published yet, show friendly message
        Alert.alert(
          t('profile.rateApp'),
          t('profile.rateAppNotPublished') || 'Thank you for your interest! Our app is currently in development and will be available on the App Store and Google Play Store soon. We appreciate your support!'
        );
        return;
      }

      console.log('✅ [Rate App] StoreReview is available');
      
      // Check if the device supports in-app review
      console.log('⭐ [Rate App] Checking hasAction()...');
      const isAvailable = await StoreReview.hasAction();
      console.log('⭐ [Rate App] hasAction() result:', isAvailable);
      
      if (isAvailable) {
        console.log('✅ [Rate App] In-app review is available, requesting review...');
        // Try to request in-app review (iOS/Android native prompt)
        // Note: Platform may not show the prompt if it was recently shown
        try {
          await StoreReview.requestReview();
          console.log('✅ [Rate App] requestReview() called successfully');
        } catch (reviewError) {
          console.error('❌ [Rate App] Error calling requestReview():', reviewError);
        }
        
        // After attempting to show the review prompt, always offer to open store page
        // This handles the case where the prompt doesn't appear (due to platform limits)
        console.log('⭐ [Rate App] Setting timeout to show store option...');
        setTimeout(() => {
          console.log('⭐ [Rate App] Timeout fired, getting store URL...');
          try {
            const storeUrl = StoreReview.storeUrl();
            console.log('⭐ [Rate App] Store URL:', storeUrl);
            
            if (storeUrl) {
              console.log('✅ [Rate App] Store URL exists, showing alert to open store');
              Alert.alert(
                t('profile.rateApp'),
                t('profile.rateAppOpenStore') || 'Would you like to open the App Store to rate our app?',
                [
                  {
                    text: t('common.cancel') || 'Cancel',
                    style: 'cancel',
                    onPress: () => console.log('⭐ [Rate App] User cancelled opening store'),
                  },
                  {
                    text: t('profile.openStore') || 'Open Store',
                    onPress: async () => {
                      console.log('⭐ [Rate App] User chose to open store');
                      try {
                        console.log('⭐ [Rate App] Checking if URL can be opened:', storeUrl);
                        const supported = await Linking.canOpenURL(storeUrl);
                        console.log('⭐ [Rate App] URL can be opened:', supported);
                        
                        if (supported) {
                          console.log('✅ [Rate App] Opening store URL...');
                          await Linking.openURL(storeUrl);
                          console.log('✅ [Rate App] Store URL opened successfully');
                        } else {
                          console.log('❌ [Rate App] URL cannot be opened');
                          Alert.alert(
                            t('common.error'),
                            t('profile.rateAppError') || 'Unable to open app store. Please search for our app in the App Store or Google Play Store.'
                          );
                        }
                      } catch (linkError) {
                        console.error('❌ [Rate App] Error opening store URL:', linkError);
                        Alert.alert(
                          t('common.error'),
                          t('profile.rateAppError') || 'Unable to open app store. Please search for our app in the App Store or Google Play Store.'
                        );
                      }
                    },
                  },
                ]
              );
            } else {
              console.log('⚠️ [Rate App] Store URL is null/undefined - app may not be published yet');
              // App is not published yet, show friendly message
              Alert.alert(
                t('profile.rateApp'),
                t('profile.rateAppNotPublished') || 'Thank you for your interest! Our app is currently in development and will be available on the App Store and Google Play Store soon. We appreciate your support!'
              );
            }
          } catch (urlError) {
            console.error('❌ [Rate App] Error getting store URL:', urlError);
            // Show friendly message on error
            Alert.alert(
              t('profile.rateApp'),
              t('profile.rateAppNotPublished') || 'Thank you for your interest! Our app is currently in development and will be available on the App Store and Google Play Store soon. We appreciate your support!'
            );
          }
        }, 500); // Small delay to let the review prompt appear first if it will
      } else {
        console.log('⚠️ [Rate App] In-app review is not available, trying to open store directly...');
        // Fallback: Open the app store page directly
        try {
          const storeUrl = StoreReview.storeUrl();
          console.log('⭐ [Rate App] Store URL (fallback):', storeUrl);
          
          if (storeUrl) {
            const supported = await Linking.canOpenURL(storeUrl);
            console.log('⭐ [Rate App] URL can be opened (fallback):', supported);
            
            if (supported) {
              console.log('✅ [Rate App] Opening store URL directly...');
              await Linking.openURL(storeUrl);
              console.log('✅ [Rate App] Store URL opened successfully (fallback)');
            } else {
              console.log('❌ [Rate App] URL cannot be opened (fallback)');
              Alert.alert(
                t('common.error'),
                t('profile.rateAppError') || 'Unable to open app store. Please search for our app in the App Store or Google Play Store.'
              );
            }
          } else {
            console.log('⚠️ [Rate App] Store URL is null/undefined (fallback)');
            // App not published, show friendly message
            Alert.alert(
              t('profile.rateApp'),
              t('profile.rateAppNotPublished') || 'Thank you for your interest! Our app is currently in development and will be available on the App Store and Google Play Store soon. We appreciate your support!'
            );
          }
        } catch (fallbackError) {
          console.error('❌ [Rate App] Error in fallback logic:', fallbackError);
        }
      }
    } catch (error) {
      console.error('❌ [Rate App] Error in handleRateApp:', error);
      console.error('❌ [Rate App] Error stack:', error.stack);
      console.error('❌ [Rate App] Error message:', error.message);
      
      // Fallback: Try to open store URL directly
      console.log('⭐ [Rate App] Trying fallback: open store URL directly');
      try {
        const storeUrl = StoreReview?.storeUrl();
        console.log('⭐ [Rate App] Store URL (error fallback):', storeUrl);
        
        if (storeUrl) {
          const supported = await Linking.canOpenURL(storeUrl);
          console.log('⭐ [Rate App] URL can be opened (error fallback):', supported);
          
          if (supported) {
            console.log('✅ [Rate App] Opening store URL (error fallback)...');
            await Linking.openURL(storeUrl);
            console.log('✅ [Rate App] Store URL opened successfully (error fallback)');
            return;
          }
        } else {
          console.log('⚠️ [Rate App] Store URL is null/undefined (error fallback)');
        }
      } catch (fallbackError) {
        console.error('❌ [Rate App] Error in error fallback:', fallbackError);
      }
      
      // Final fallback: Show friendly message
      console.log('⚠️ [Rate App] Showing final fallback message');
      Alert.alert(
        t('profile.rateApp'),
        t('profile.rateAppNotPublished') || 'Thank you for your interest! Our app is currently in development and will be available on the App Store and Google Play Store soon. We appreciate your support!'
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Starting logout process...');
              await logout();
              console.log('✅ Logout completed successfully');
            } catch (error) {
              console.error('❌ Logout failed:', error);
              Alert.alert('Logout Error', 'Failed to sign out. Please try again.');
            }
          }
        }
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
            </>
          )}
          {/* Only show Trust Account for parents */}
          {userRole === 'parent' && (
            renderMenuItem(
              'Trust Account',
              'dollar-sign',
              handleTrustAccountPress,
              '#00B894',
              trustAccountDoc ? t('profile.available') : t('profile.notAvailable'),
              loadingTrustAccountDoc
            )
          )}
          {renderMenuItem(t('profile.benefitPackage'), 'gift', () => navigation.navigate('Benefits'), '#333')}
          {renderMenuItem(t('profile.injectionVideos'), 'play-circle', () => Alert.alert(t('profile.injectionVideos'), 'Coming Soon'), '#FFC107')}
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
          {renderMenuItem(t('profile.rateUs'), 'thumbs-up', () => Alert.alert(t('profile.rateUs'), 'Coming Soon'), '#FF9800')}
          {renderMenuItem(t('profile.contactUs'), 'phone', () => navigation.navigate('ContactUs'), '#4CAF50')}
          {renderMenuItem(t('profile.aboutApp'), 'info', () => Alert.alert(t('profile.aboutApp'), 'Version 1.0.0'), '#2196F3')}
        </View>

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
  logoutButton: {
    backgroundColor: '#fff',
    marginTop: 20,
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
