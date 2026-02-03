import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Keyboard, SafeAreaView } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export default function AmbassadorScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    referredSurrogateName: '',
    referredSurrogatePhone: '',
    referredSurrogateEmail: '',
    notes: '',
  });

  const handleSubmit = async () => {
    const name = (form.referredSurrogateName || '').trim();
    const phone = (form.referredSurrogatePhone || '').trim();
    if (!name) {
      Alert.alert(t('common.error'), t('referralSurrogate.errorName'));
      return;
    }
    if (!phone) {
      Alert.alert(t('common.error'), t('referralSurrogate.errorPhone'));
      return;
    }
    if (!user?.id) {
      Alert.alert(t('common.error'), t('referralSurrogate.errorNotLoggedIn'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('referral_submissions').insert({
        referrer_user_id: user.id,
        referrer_name: user.name || user.email || '',
        referrer_email: user.email || '',
        referred_surrogate_name: name,
        referred_surrogate_phone: phone,
        referred_surrogate_email: (form.referredSurrogateEmail || '').trim() || null,
        notes: (form.notes || '').trim() || null,
      });
      if (error) throw error;
      Alert.alert(t('referralSurrogate.submittedTitle'), t('referralSurrogate.submittedMessage'), [
        { text: t('common.close'), onPress: () => navigation.goBack() },
      ]);
      setForm({ referredSurrogateName: '', referredSurrogatePhone: '', referredSurrogateEmail: '', notes: '' });
    } catch (e) {
      console.error('Referral submit error:', e);
      Alert.alert(t('common.error'), t('referralSurrogate.submitError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-left" size={24} color="#2A7BF6" />
          <Text style={styles.backBtnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        <Text style={styles.title}>{t('referralSurrogate.title')}</Text>
        <Text style={styles.subtitle}>{t('referralSurrogate.subtitle')}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t('referralSurrogate.referredName')} *</Text>
          <TextInput
            style={styles.input}
            value={form.referredSurrogateName}
            onChangeText={(v) => setForm((f) => ({ ...f, referredSurrogateName: v }))}
            placeholder={t('referralSurrogate.referredNamePlaceholder')}
          />
          <Text style={styles.label}>{t('referralSurrogate.referredPhone')} *</Text>
          <TextInput
            style={styles.input}
            value={form.referredSurrogatePhone}
            onChangeText={(v) => setForm((f) => ({ ...f, referredSurrogatePhone: v }))}
            placeholder={t('referralSurrogate.referredPhonePlaceholder')}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>{t('referralSurrogate.referredEmail')}</Text>
          <TextInput
            style={styles.input}
            value={form.referredSurrogateEmail}
            onChangeText={(v) => setForm((f) => ({ ...f, referredSurrogateEmail: v }))}
            placeholder={t('referralSurrogate.referredEmailPlaceholder')}
            keyboardType="email-address"
          />
          <Text style={styles.label}>{t('referralSurrogate.notes')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.notes}
            onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            placeholder={t('referralSurrogate.notesPlaceholder')}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{t('referralSurrogate.submit')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 16 },
  backBtnText: { color: '#1A1D1E', fontSize: 16, marginLeft: 4, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: { height: 88, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#2A7BF6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
