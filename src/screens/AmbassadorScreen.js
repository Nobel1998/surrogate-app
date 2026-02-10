import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export default function AmbassadorScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [referredName, setReferredName] = useState('');
  const [referredPhone, setReferredPhone] = useState('');
  const [referredEmail, setReferredEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const name = referredName.trim();
    const phone = referredPhone.trim();
    if (!name) {
      Alert.alert('', t('ambassador.referredSurrogateName').replace(' *', '') + ' ' + t('common.required', { defaultValue: 'is required' }));
      return false;
    }
    if (!phone) {
      Alert.alert('', t('ambassador.referredSurrogatePhone').replace(' *', '') + ' ' + t('common.required', { defaultValue: 'is required' }));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user?.id) {
      Alert.alert('', t('ambassador.submitError'));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('referral_submissions').insert({
        referred_surrogate_name: referredName.trim(),
        referred_surrogate_phone: referredPhone.trim(),
        referred_surrogate_email: referredEmail.trim() || null,
        notes: notes.trim() || null,
        submitted_by_user_id: user.id,
      });
      if (error) throw error;
      Alert.alert(t('ambassador.submitSuccess'), t('ambassador.submitSuccessMessage'));
      setReferredName('');
      setReferredPhone('');
      setReferredEmail('');
      setNotes('');
    } catch (err) {
      console.warn('Referral submit error:', err);
      Alert.alert(t('ambassador.submissionError') || 'Error', t('ambassador.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color="#2A7BF6" />
          <Text style={styles.backButtonText}>{t('ambassador.back') || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('ambassador.referralBonusTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.mainTitle}>{t('ambassador.referralBonusTitle')}</Text>
          <Text style={styles.cta}>{t('ambassador.referralBonusCta')}</Text>
          <Text style={styles.description}>
            {t('ambassador.referralBonusDescription')}
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>{t('ambassador.referredSurrogateName')}</Text>
            <TextInput
              style={styles.input}
              value={referredName}
              onChangeText={setReferredName}
              placeholder={t('ambassador.referredSurrogateNamePlaceholder')}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>{t('ambassador.referredSurrogatePhone')}</Text>
            <TextInput
              style={styles.input}
              value={referredPhone}
              onChangeText={setReferredPhone}
              placeholder={t('ambassador.referredSurrogatePhonePlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>{t('ambassador.referredSurrogateEmail')}</Text>
            <TextInput
              style={styles.input}
              value={referredEmail}
              onChangeText={setReferredEmail}
              placeholder={t('ambassador.referredSurrogateEmailPlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
            />

            <Text style={styles.label}>{t('ambassador.notesLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('ambassador.notesPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{t('ambassador.submitToAdmin')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonText: {
    color: '#1F2937',
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 80,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  cta: {
    fontSize: 16,
    color: '#2A7BF6',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
  },
  textArea: {
    minHeight: 88,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#2A7BF6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
