import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const MAX_SUBMISSIONS = 5;
const BUCKET = 'documents';
const STORAGE_PREFIX = 'online_claim_submissions';

export default function OnlineClaimsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSubmissions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('online_claim_submissions')
        .select('id, file_url, file_name, amount, description, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setList(data || []);
    } catch (e) {
      console.warn('Online claims load error:', e);
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSubmissions();
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to upload invoice/receipt.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) setImage(result.assets[0]);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to select image.');
    }
  };

  const submitClaim = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to submit a claim.');
      return;
    }
    if (list.length >= MAX_SUBMISSIONS) {
      Alert.alert('Limit reached', `You can submit up to ${MAX_SUBMISSIONS} claims.`);
      return;
    }
    if (!image?.uri) {
      Alert.alert('Image required', 'Please select an invoice or receipt image.');
      return;
    }

    setSubmitting(true);
    try {
      const ext = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${safeExt}`;
      const filePath = `${STORAGE_PREFIX}/${user.id}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: image.uri,
        type: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
        name: fileName,
      });

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, formData, {
          contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      const fileUrl = urlData.publicUrl;

      const amountNum = amount.trim() ? parseFloat(amount.trim().replace(/[^0-9.]/g, '')) : null;
      const { error: insertError } = await supabase.from('online_claim_submissions').insert({
        user_id: user.id,
        file_url: fileUrl,
        file_name: fileName,
        amount: amountNum,
        description: description.trim() || null,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setAmount('');
      setDescription('');
      setImage(null);
      await loadSubmissions();
      Alert.alert('Submitted', 'Your claim has been submitted for review.');
    } catch (e) {
      console.warn('Submit error:', e);
      Alert.alert('Error', e.message || 'Failed to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const openFile = (url) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Online Claims</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
      >
        <Text style={styles.sectionTitle}>
          My submissions ({list.length}/{MAX_SUBMISSIONS})
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#6C5CE7" style={{ marginVertical: 24 }} />
        ) : (
          list.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardAmount}>
                  ${item.amount != null ? Number(item.amount).toFixed(2) : '0.00'}
                </Text>
                <View style={[styles.badge, item.status === 'approved' && styles.badgeGreen, item.status === 'rejected' && styles.badgeRed]}>
                  <Text style={styles.badgeText}>{item.status === 'pending' ? 'Pending' : item.status === 'approved' ? 'Approved' : 'Rejected'}</Text>
                </View>
              </View>
              {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
              <TouchableOpacity onPress={() => openFile(item.file_url)} style={styles.viewFile}>
                <Text style={styles.viewFileText}>View file</Text>
                <Icon name="external-link" size={14} color="#6C5CE7" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Submit new claim (invoice/receipt)</Text>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount (optional)"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>
          <TextInput
            style={[styles.input, styles.inputFull]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.selectImageBtn} onPress={pickImage}>
            <Icon name="image" size={22} color="#666" />
            <Text style={styles.selectImageText}>
              {image ? 'Image selected' : 'Select invoice/receipt image'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, (submitting || list.length >= MAX_SUBMISSIONS) && styles.submitBtnDisabled]}
            onPress={submitClaim}
            disabled={submitting || list.length >= MAX_SUBMISSIONS}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F0F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDate: { fontSize: 13, color: '#666', marginBottom: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardAmount: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
  },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeRed: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#78350f' },
  cardDesc: { fontSize: 14, color: '#666', marginTop: 4 },
  viewFile: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  viewFileText: { fontSize: 14, color: '#6C5CE7', fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  inputPrefix: { fontSize: 16, color: '#333', marginRight: 4 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1a1a1a' },
  inputFull: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  selectImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 16,
    marginBottom: 20,
    gap: 8,
  },
  selectImageText: { fontSize: 16, color: '#666' },
  submitBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
});
