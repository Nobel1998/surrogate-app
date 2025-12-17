import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export default function MyInfoScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    race: '',
    location: '',
  });
  const [dateOfBirthDisplay, setDateOfBirthDisplay] = useState('');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, phone, date_of_birth, race, location')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is okay for new users
        console.error('Error loading profile:', error);
      }

      if (data) {
        const dobDisplay = formatDateForInput(data.date_of_birth || '');
        setProfileData({
          name: data.name || user.name || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          race: data.race || '',
          location: data.location || '',
        });
        setDateOfBirthDisplay(dobDisplay);
      } else {
        // Fallback to user data from auth
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          date_of_birth: '',
          race: '',
          location: '',
        });
        setDateOfBirthDisplay('');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !user.id) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    if (!profileData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      // Parse date of birth from display format to ISO format
      const dateOfBirthISO = parseDateFromInput(dateOfBirthDisplay);
      
      // First, get existing invite_code to preserve it (required field)
      let existingInviteCode = null;
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('invite_code')
          .eq('id', user.id)
          .maybeSingle();
        existingInviteCode = existingProfile?.invite_code || null;
      } catch (err) {
        console.error('Error fetching existing invite_code:', err);
      }

      // Generate invite_code if it doesn't exist (shouldn't happen, but safety check)
      if (!existingInviteCode) {
        const chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        existingInviteCode = code;
      }
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: profileData.name.trim(),
          email: profileData.email.trim() || user.email,
          phone: profileData.phone.trim() || null,
          date_of_birth: dateOfBirthISO || null,
          race: profileData.race.trim() || null,
          location: profileData.location.trim() || null,
          invite_code: existingInviteCode, // Preserve existing invite_code
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      // Also update auth user metadata if needed
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: profileData.name.trim(),
        },
      });

      if (authError) {
        console.error('Error updating auth user:', authError);
      }

      Alert.alert(t('common.success'), t('myInfo.saveSuccess'), [
        {
          text: t('common.close'),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert(t('common.error'), error.message || t('myInfo.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle ISO format (YYYY-MM-DD)
      if (dateString.includes('-') && dateString.length >= 10) {
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          // ISO format: YYYY-MM-DD
          const year = parts[0];
          const month = parts[1];
          const day = parts[2];
          return `${month}-${day}-${year}`;
        }
      }
      
      // Try parsing as Date object
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}-${day}-${year}`;
    } catch (e) {
      return '';
    }
  };

  const parseDateFromInput = (dateString) => {
    if (!dateString || !dateString.trim()) return null;
    
    // Remove any non-digit and non-dash characters
    const cleaned = dateString.replace(/[^\d-]/g, '');
    
    // Format: MM-DD-YYYY
    const parts = cleaned.split('-').filter(p => p.length > 0);
    
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      
      // Validate the date parts
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      const yearNum = parseInt(year, 10);
      
      if (isNaN(monthNum) || isNaN(dayNum) || isNaN(yearNum)) {
        return null;
      }
      
      // Basic validation
      if (monthNum < 1 || monthNum > 12) return null;
      if (dayNum < 1 || dayNum > 31) return null;
      if (yearNum < 1900 || yearNum > 2100) return null;
      
      // Validate the actual date
      const date = new Date(yearNum, monthNum - 1, dayNum);
      if (isNaN(date.getTime())) return null;
      
      // Check if the date is valid (e.g., not Feb 30)
      if (date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
        return null;
      }
      
      return `${year}-${month}-${day}`;
    }
    
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Info</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2A7BF6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myInfo.title')}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
          <Text style={[styles.saveButtonText, saving && styles.saveButtonTextDisabled]}>
            {saving ? t('myInfoAdditional.saving') : t('common.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('myInfo.personalInfo')}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('myInfo.fullName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('myInfoAdditional.enterFullName')}
              value={profileData.name}
              onChangeText={(text) => setProfileData({ ...profileData, name: text })}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('myInfo.email')}</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              placeholder={t('myInfoAdditional.emailAddress')}
              value={profileData.email}
              editable={false}
              placeholderTextColor="#999"
            />
            <Text style={styles.inputHint}>{t('myInfo.emailCannotChange')}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('myInfo.phone')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('myInfoAdditional.enterPhone')}
              value={profileData.phone}
              onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('myInfo.dateOfBirth')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('myInfoAdditional.enterDateOfBirth')}
              value={dateOfBirthDisplay}
              onChangeText={(text) => {
                // Allow user to type freely, just update display value
                setDateOfBirthDisplay(text);
              }}
              placeholderTextColor="#999"
            />
            <Text style={styles.inputHint}>{t('myInfo.dateFormat')}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('myInfo.race')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('myInfoAdditional.enterRace')}
              value={profileData.race}
              onChangeText={(text) => setProfileData({ ...profileData, race: text })}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('myInfo.location')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('myInfoAdditional.enterAddress')}
              value={profileData.location}
              onChangeText={(text) => setProfileData({ ...profileData, location: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('myInfo.accountInfo')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('myInfo.userId')}</Text>
            <Text style={styles.infoValue} selectable>
              {user?.id || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('myInfo.role')}</Text>
            <Text style={styles.infoValue}>
              {(() => {
                const role = (user?.role || '').toLowerCase();
                if (role === 'surrogate') return t('myInfo.roleSurrogate');
                if (role === 'parent') return t('myInfo.roleParent');
                return user?.role || 'N/A';
              })()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A7BF6',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flexShrink: 0,
    marginRight: 12,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
});

