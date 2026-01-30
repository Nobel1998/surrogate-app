import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

const MAX_SUBMISSIONS = 5;
const DOCUMENTS_BUCKET = 'documents';

export default function OnlineClaimsScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [sharedDoc, setSharedDoc] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [matchId, setMatchId] = useState(null);

  const loadSharedDoc = useCallback(async () => {
    if (!user?.id) return;
    setLoadingDoc(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_type', 'online_claims')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error) setSharedDoc(data);
    } catch (e) {
      console.error('Error loading online claims doc:', e);
    } finally {
      setLoadingDoc(false);
    }
  }, [user?.id]);

  const loadSubmissions = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('online_claim_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setSubmissions(data || []);
    } catch (e) {
      console.error('Error loading submissions:', e);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [user?.id]);

  const loadMatchId = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('surrogate_matches')
        .select('id')
        .eq('surrogate_id', user.id)
        .in('status', ['matched', 'pregnant', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) setMatchId(data.id);
    } catch (e) {
      console.error('Error loading match:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSharedDoc();
    loadSubmissions();
    loadMatchId();
  }, [loadSharedDoc, loadSubmissions, loadMatchId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadSharedDoc(), loadSubmissions(), loadMatchId()]);
    setRefreshing(false);
  }, [loadSharedDoc, loadSubmissions, loadMatchId]);

  const pickFile = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error') || 'Error',
          t('profile.photoRelease') ? 'Please allow photo access to upload receipt.' : 'Please allow photo access.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert(t('common.error') || 'Error', 'Failed to pick image.');
    }
  };

  const submitClaim = async () => {
    const amt = amount.trim();
    const desc = description.trim();
    if (!selectedFile) {
      Alert.alert(t('common.error') || 'Error', t('onlineClaims.selectFile') || 'Please select an invoice/receipt image.');
      return;
    }
    if (submissions.length >= MAX_SUBMISSIONS) {
      Alert.alert(
        t('common.error') || 'Error',
        t('onlineClaims.maxReached') || `You can submit at most ${MAX_SUBMISSIONS} claims.`
      );
      return;
    }
    setSubmitting(true);
    try {
      const ext = selectedFile.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
      const path = `online_claim_submissions/${user.id}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        type: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
        name: fileName,
      });

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, formData, {
          contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // #region agent log
      const tableName = 'online_claim_submissions';
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineClaimsScreen.js:submitClaim:beforeInsert',message:'About to insert online claim',data:{tableName,schema:'public',userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H4'})}).catch(()=>{});
      // #endregion

      const { error: insertError } = await supabase
        .from(tableName)
        .insert({
          user_id: user.id,
          match_id: matchId || null,
          file_url: publicUrl,
          file_name: selectedFile.fileName || fileName,
          amount: amt ? parseFloat(amt) : null,
          description: desc || null,
          status: 'pending',
        });

      // #region agent log
      if (insertError) fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineClaimsScreen.js:submitClaim:insertError',message:'Insert failed',data:{code:insertError?.code,message:insertError?.message,hint:insertError?.hint},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3,H4'})}).catch(()=>{});
      // #endregion

      if (insertError) throw insertError;

      setAmount('');
      setDescription('');
      setSelectedFile(null);
      await loadSubmissions();
      Alert.alert(t('common.success') || 'Success', t('onlineClaims.submitSuccess') || 'Claim submitted. Admin will review it.');
    } catch (err) {
      console.error('Submit claim error:', err);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineClaimsScreen.js:submitClaim:catch',message:'Submit claim error caught',data:{code:err?.code,message:err?.message,hint:err?.hint},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3,H4'})}).catch(()=>{});
      // #endregion
      Alert.alert(
        t('common.error') || 'Error',
        err.message || (t('onlineClaims.submitFailed') || 'Failed to submit. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openSharedDoc = () => {
    if (!sharedDoc?.file_url) {
      Alert.alert(
        t('documents.noDocument') || 'No document',
        t('documents.notUploaded', { document: t('myMatch.onlineClaims') || 'Online Claims' })
      );
      return;
    }
    Linking.openURL(sharedDoc.file_url).catch(() =>
      Alert.alert(t('common.error') || 'Error', t('documents.cannotOpen') || 'Cannot open link')
    );
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('myMatch.onlineClaims') || 'Online Claims'}</Text>
      </View>

      {/* 共享文档：展示用 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('onlineClaims.sharedDocument') || 'Shared document (view only)'}</Text>
        {loadingDoc ? (
          <ActivityIndicator size="small" color="#6C5CE7" style={styles.loader} />
        ) : (
          <TouchableOpacity style={styles.docCard} onPress={openSharedDoc} disabled={!sharedDoc?.file_url}>
            <Icon name="file-text" size={28} color="#6C5CE7" />
            <View style={styles.docInfo}>
              <Text style={styles.docLabel}>
                {sharedDoc?.file_url ? (t('profile.available') || 'Available') : (t('profile.notAvailable') || 'Not uploaded yet')}
              </Text>
              <Text style={styles.docHint}>{t('onlineClaims.viewSharedDocHint') || 'Tap to view the document shared by admin.'}</Text>
            </View>
            {sharedDoc?.file_url && <Icon name="external-link" size={20} color="#999" />}
          </TouchableOpacity>
        )}
      </View>

      {/* 我的报销提交列表 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('onlineClaims.mySubmissions') || 'My submissions'} ({submissions.length}/{MAX_SUBMISSIONS})
        </Text>
        {loadingSubmissions ? (
          <ActivityIndicator size="small" color="#6C5CE7" style={styles.loader} />
        ) : submissions.length === 0 ? (
          <Text style={styles.emptyText}>{t('onlineClaims.noSubmissions') || 'No submissions yet.'}</Text>
        ) : (
          submissions.map((s) => (
            <View key={s.id} style={styles.submissionCard}>
              <View style={styles.subRow}>
                <Text style={styles.subDate}>{formatDate(s.created_at)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: s.status === 'approved' ? '#22c55e' : s.status === 'rejected' ? '#ef4444' : '#eab308' }]}>
                  <Text style={styles.statusText}>{s.status}</Text>
                </View>
              </View>
              {(s.amount != null && s.amount !== '') && <Text style={styles.subAmount}>${Number(s.amount).toFixed(2)}</Text>}
              {s.description ? <Text style={styles.subDesc} numberOfLines={2}>{s.description}</Text> : null}
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => Linking.openURL(s.file_url).catch(() => {})}
              >
                <Text style={styles.linkBtnText}>{t('onlineClaims.viewFile') || 'View file'}</Text>
                <Icon name="external-link" size={14} color="#6C5CE7" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* 提交新报销 */}
      {submissions.length < MAX_SUBMISSIONS && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('onlineClaims.submitNew') || 'Submit new claim (invoice/receipt)'}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>$</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder={t('onlineClaims.amountPlaceholder') || 'Amount (optional)'}
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('onlineClaims.descriptionPlaceholder') || 'Description (optional)'}
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={styles.pickBtn} onPress={pickFile}>
            <Icon name="image" size={22} color="#6C5CE7" />
            <Text style={styles.pickBtnText}>
              {selectedFile ? (selectedFile.fileName || 'Image selected') : (t('onlineClaims.selectFile') || 'Select invoice/receipt image')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, (!selectedFile || submitting) && styles.submitBtnDisabled]}
            onPress={submitClaim}
            disabled={!selectedFile || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{t('onlineClaims.submit') || 'Submit'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  content: { padding: 16, paddingTop: Platform.OS === 'ios' ? 56 : 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 12, padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  loader: { marginVertical: 12 },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  docInfo: { flex: 1, marginLeft: 12 },
  docLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  docHint: { fontSize: 12, color: '#666', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  submissionCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subDate: { fontSize: 12, color: '#666' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#fff', textTransform: 'capitalize' },
  subAmount: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  subDesc: { fontSize: 13, color: '#555', marginBottom: 8 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkBtnText: { fontSize: 14, color: '#6C5CE7', fontWeight: '500' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 10,
    paddingLeft: 14,
  },
  amountPrefix: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  amountInput: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    paddingLeft: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6C5CE7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  pickBtnText: { fontSize: 15, color: '#6C5CE7', fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  footer: { height: 40 },
});
