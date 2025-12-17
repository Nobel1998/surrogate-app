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
  const [agencyRetainerDoc, setAgencyRetainerDoc] = useState(null);
  const [hipaaReleaseDoc, setHipaaReleaseDoc] = useState(null);
  const [photoReleaseDoc, setPhotoReleaseDoc] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingHipaaDoc, setLoadingHipaaDoc] = useState(false);
  const [loadingPhotoDoc, setLoadingPhotoDoc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAgencyRetainerDoc();
    loadHipaaReleaseDoc();
    loadPhotoReleaseDoc();
  }, [user]);

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
      await Promise.all([
        loadAgencyRetainerDoc(),
        loadHipaaReleaseDoc(),
        loadPhotoReleaseDoc(),
      ]);
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

  const handleRateApp = async () => {
    try {
      // Check if StoreReview is available (may not be available if app is not published)
      if (!StoreReview || typeof StoreReview.hasAction !== 'function') {
        // App is not published yet, show friendly message
        Alert.alert(
          t('profile.rateApp'),
          t('profile.rateAppNotPublished') || 'Thank you for your interest! Our app is currently in development and will be available on the App Store and Google Play Store soon. We appreciate your support!'
        );
        return;
      }

      // Check if the device supports in-app review
      const isAvailable = await StoreReview.hasAction();
      
      if (isAvailable) {
        // Request in-app review (iOS/Android native prompt)
        await StoreReview.requestReview();
      } else {
        // Fallback: Open the app store page
        const storeUrl = StoreReview.storeUrl();
        if (storeUrl) {
          const supported = await Linking.canOpenURL(storeUrl);
          if (supported) {
            await Linking.openURL(storeUrl);
          } else {
            Alert.alert(
              t('common.error'),
              t('profile.rateAppError') || 'Unable to open app store. Please search for our app in the App Store or Google Play Store.'
            );
          }
        } else {
          // App not published, show friendly message
          Alert.alert(
            t('profile.rateApp'),
            t('profile.rateAppNotPublished') || 'Thank you for your interest! Our app is currently in development and will be available on the App Store and Google Play Store soon. We appreciate your support!'
          );
        }
      }
    } catch (error) {
      console.error('Error requesting app review:', error);
      // Fallback: Show friendly message for unpublished app
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
          {renderMenuItem(t('profile.contactUs'), 'phone', () => navigation.navigate('Company'), '#4CAF50')}
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
