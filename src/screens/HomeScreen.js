import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, Alert, Modal, TextInput, SafeAreaView, Platform, StatusBar, Share, RefreshControl, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import AsyncStorageLib from '../utils/Storage';

// Normalize stage values to lowercase for consistent filtering
const normalizeStage = (value = 'pregnancy') => {
  if (!value) return 'pregnancy';
  return String(value).toLowerCase();
};

const STAGE_ORDER = ['pre', 'pregnancy', 'ob_visit', 'delivery'];

// Function to get stage options with translations
const getStageOptions = (t) => [
  { key: 'pre', label: t('home.stagePre'), icon: 'heart', description: 'Preparation & Matching' },
  { key: 'pregnancy', label: t('home.stagePost'), icon: 'heart', description: 'Updates & Checkups' },
  { key: 'ob_visit', label: t('home.stageOB'), icon: 'user', description: 'OB/GYN Care' },
  { key: 'delivery', label: t('home.stageDelivery'), icon: 'gift', description: 'Birth & Post-birth' },
];

// Function to get embryo day options with translations
const getEmbryoDayOptions = (t) => [
  { key: 'day5', label: t('home.day5Embryo'), transferGestationalDays: 19 }, // spec: 2w+5d (14+5=19)
  { key: 'day3', label: t('home.day3Embryo'), transferGestationalDays: 19 }, // spec: 2w+5d
];

// 视频播放器组件
const VideoPlayer = ({ source, style }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(source, player => {
    player.loop = false;
    // 不自动播放，等待用户点击
  });

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <TouchableOpacity onPress={togglePlayback} style={style}>
      <VideoView
        style={style}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      {!isPlaying && (
        <View style={styles.playButtonOverlay}>
          <View style={styles.playButton}>
            <Text style={styles.playButtonText}>▶️</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import Avatar from '../components/Avatar';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { posts, likedPosts, likedComments, addPost, deletePost, handleLike, handleCommentLike, addComment, deleteComment, getComments, setCurrentUser, currentUserId, isLoading, isSyncing, refreshData, forceCompleteLoading, hasInitiallyLoaded } = useAppContext();
  const { user, isLoading: authLoading, updateProfile } = useAuth();
  const { t } = useLanguage();
  const { sendSurrogateProgressUpdate } = useNotifications();
  const STAGE_OPTIONS = getStageOptions(t);
  const EMBRYO_DAY_OPTIONS = getEmbryoDayOptions(t);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [postText, setPostText] = useState('');
  const [postStage, setPostStage] = useState('pre'); // will sync with serverStage
  const [serverStage, setServerStage] = useState('pre'); // fetched from backend (admin controlled)
  const [stageLoaded, setStageLoaded] = useState(false); // block interactions until fetched
  // Use ref to track the REAL stage synchronously (avoids React state batching issues)
  const realStageRef = React.useRef('pre');
  const realMatchIdRef = React.useRef(null);
  const stageDataReadyRef = React.useRef(false); // Track if stage data has been fetched
  const [stageVersion, setStageVersion] = useState(0); // force re-render when stage changes locally
  const [stageFilter, setStageFilter] = useState('all');
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'feed'
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replyToComment, setReplyToComment] = useState(null); // Store comment being replied to
  const [refreshing, setRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [matchedSurrogateId, setMatchedSurrogateId] = useState(null);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [matchCheckInProgress, setMatchCheckInProgress] = useState(false);
  const [medicalReports, setMedicalReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [stageUpdateLoading, setStageUpdateLoading] = useState(false);
  const roleLower = (user?.role || '').toLowerCase();
  const isSurrogateRole = roleLower === 'surrogate';
  const isParentRole = roleLower === 'parent';
  const [transferDateDraft, setTransferDateDraft] = useState('');
  const [savingTransferDate, setSavingTransferDate] = useState(false);
  const [transferEmbryoDayDraft, setTransferEmbryoDayDraft] = useState('day5'); // 'day3' | 'day5'
  const [isEditingTransferDate, setIsEditingTransferDate] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);
  // Medical information states
  const [medicationStartDate, setMedicationStartDate] = useState('');
  const [pregnancyTestDate, setPregnancyTestDate] = useState('');
  const [pregnancyTestDate2, setPregnancyTestDate2] = useState('');
  const [pregnancyTestDate3, setPregnancyTestDate3] = useState('');
  const [pregnancyTestDate4, setPregnancyTestDate4] = useState('');
  const [fetalBeatConfirm, setFetalBeatConfirm] = useState('None');
  const [savingMedicalInfo, setSavingMedicalInfo] = useState(false);
  const [loadingMedicalInfo, setLoadingMedicalInfo] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState(null);
  const [hasApplication, setHasApplication] = useState(false);
  const [checkingApplication, setCheckingApplication] = useState(true);

  // Check if surrogate user has submitted application
  useEffect(() => {
    const checkApplication = async () => {
      if (!user?.id || !isSurrogateRole) {
        setCheckingApplication(false);
        setHasApplication(true); // For non-surrogates, always show content
        return;
      }

      try {
        const { data, error } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking application:', error);
          setHasApplication(false);
        } else {
          setHasApplication(!!data);
        }
      } catch (error) {
        console.error('Failed to check application:', error);
        setHasApplication(false);
      } finally {
        setCheckingApplication(false);
      }
    };

    checkApplication();
  }, [user?.id, isSurrogateRole]);

  const getCurrentStageKey = React.useCallback(() => {
    // 如果后台有设置，优先使用后台控制阶段
    const normalized = normalizeStage(serverStage || 'pre');
    if (STAGE_ORDER.includes(normalized)) return normalized;
    return 'pre';
  }, [serverStage]);

  const getStageStatus = React.useCallback((stageKey) => {
    const key = normalizeStage(stageKey);
    // 未匹配的父母：仅第一阶段可见，其余视为未来锁定
    if (isParentRole && !matchedSurrogateId) {
      if (key === 'pre') return 'current';
      return 'future';
    }
    const currentKey = getCurrentStageKey();
    const idx = STAGE_ORDER.indexOf(key);
    const currentIdx = STAGE_ORDER.indexOf(currentKey);
    if (idx === -1 || currentIdx === -1) return 'future';
    if (idx < currentIdx) return 'past';
    if (idx === currentIdx) return 'current';
    return 'future';
  }, [isParentRole, matchedSurrogateId, getCurrentStageKey]);

  // ===== Pregnancy business logic (based on transfer_date) =====
  const transferDateStr = useMemo(() => {
    // For parent users, get transfer_date from matched surrogate's profile
    // For surrogate users, get from their own profile
    let v = '';
    if (isParentRole && matchedProfile?.transfer_date) {
      v = matchedProfile.transfer_date;
    } else {
      v =
      user?.transfer_date ||
      user?.transferDate ||
      user?.user_metadata?.transfer_date ||
      user?.user_metadata?.transferDate ||
      '';
    }
    const result = String(v || '').trim();
    console.log('📊 transferDateStr computed:', { 
      result, 
      fromUser: user?.transfer_date,
      fromMatchedProfile: matchedProfile?.transfer_date,
      fromMetadata: user?.user_metadata?.transfer_date,
      userId: user?.id,
      isParent: isParentRole,
      hasMatchedProfile: !!matchedProfile,
    });
    return result;
  }, [user?.transfer_date, user?.transferDate, user?.user_metadata, user?.id, isParentRole, matchedProfile?.transfer_date]);

  const normalizeEmbryoDayKey = (v) => {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'day3' || s === 'd3' || s === '3' || s === '3day') return 'day3';
    if (s === 'day5' || s === 'd5' || s === '5' || s === '5day') return 'day5';
    return 'day5';
  };

  const transferEmbryoDayStr = useMemo(() => {
    // For parent users, get transfer_embryo_day from matched surrogate's profile
    // For surrogate users, get from their own profile
    let v = '';
    if (isParentRole && matchedProfile?.transfer_embryo_day) {
      v = matchedProfile.transfer_embryo_day;
    } else {
      v =
        user?.transfer_embryo_day ||
        user?.transferEmbryoDay ||
        user?.user_metadata?.transfer_embryo_day ||
        user?.user_metadata?.transferEmbryoDay ||
        '';
    }
    return String(v || '').trim();
  }, [user?.transfer_embryo_day, user?.transferEmbryoDay, user?.user_metadata, isParentRole, matchedProfile?.transfer_embryo_day]);

  // Convert MM/DD/YY to YYYY-MM-DD (for storage)
  const parseMMDDYYToISO = (s) => {
    if (!s || typeof s !== 'string') return null;
    const trimmed = s.trim();
    // Accept MM/DD/YY or MM/DD/YYYY
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!match) return null;
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    // Convert 2-digit year to 4-digit (assume 2000-2099)
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (Number.isNaN(d.getTime())) return null;
    // Validate the date (e.g., Feb 30 is invalid)
    if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
  };

  // Convert YYYY-MM-DD to MM/DD/YY (for display)
  const formatISOToMMDDYY = (isoDate) => {
    if (!isoDate) return '';
    const d = parseISODateOnlyToLocalMidnight(isoDate);
    if (!d) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
  };

  const parseISODateOnlyToLocalMidnight = (s) => {
    // Accepts YYYY-MM-DD
    if (!s || typeof s !== 'string') return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    // Normalize to local midnight to avoid timezone drift
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  };

  // Convert Date object to YYYY-MM-DD (for storage)
  const formatDateToISO = (date) => {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const todayLocalMidnight = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const pregnancyMetrics = useMemo(() => {
    const transfer = parseISODateOnlyToLocalMidnight(transferDateStr);
    if (!transfer) return null;

    const today = todayLocalMidnight();
    const diffDaysRaw = Math.floor((today.getTime() - transfer.getTime()) / (24 * 60 * 60 * 1000));
    const diffDays = Math.max(0, diffDaysRaw);

    // Per spec:
    // Transfer Day is considered:
    // - Day 3 embryo: 2w + 5d (19 days)
    // - Day 5 embryo: 2w + 0d (14 days)
    const embryoKey = normalizeEmbryoDayKey(transferEmbryoDayStr || transferEmbryoDayDraft || 'day5');
    const embryoCfg = EMBRYO_DAY_OPTIONS.find((x) => x.key === embryoKey) || EMBRYO_DAY_OPTIONS[0];
    const transferGestationalDays = embryoCfg.transferGestationalDays;
    const gestationalDays = diffDays + transferGestationalDays;
    const weeks = Math.floor(gestationalDays / 7);
    const days = gestationalDays % 7;

    // EDD: 40w (280 days) - transferGestationalDays
    const dueDate = addDays(transfer, 280 - transferGestationalDays);
    const daysToDue = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    const progress = clamp(gestationalDays / 280, 0, 1); // 40w * 7d
    const isGraduated = gestationalDays >= 70; // >=10w

    return {
      transfer,
      today,
      gestationalDays,
      weeks,
      days,
      dueDate,
      daysToDue,
      progress,
      isGraduated,
      embryoKey,
    };
  }, [transferDateStr, transferEmbryoDayStr, transferEmbryoDayDraft]);

  // Initialize draft input when user loads/changes
  useEffect(() => {
    console.log('🔄 useEffect triggered for transfer date:', {
      transferDateStr,
      transferDateDraft,
      userId: user?.id,
      userTransferDate: user?.transfer_date,
      matchedProfileTransferDate: matchedProfile?.transfer_date,
      isParent: isParentRole,
      hasMatchedProfile: !!matchedProfile,
    });
    
    // Update date draft when transferDateStr changes (e.g., after save or on load)
    // Only update if not in edit mode to avoid overwriting user input
    if (!isEditingTransferDate) {
      if (transferDateStr) {
        const formatted = formatISOToMMDDYY(transferDateStr);
        console.log('📅 Formatting date:', { transferDateStr, formatted });
        // Always update if the formatted value is different from current draft
        if (transferDateDraft !== formatted) {
          console.log('✅ Updating transferDateDraft to:', formatted);
          setTransferDateDraft(formatted);
        }
      } else {
        // If no transfer date, clear the draft
        if (transferDateDraft) {
          console.log('🧹 Clearing transferDateDraft');
          setTransferDateDraft('');
        }
      }
    }
    
    // Always use Day 5 embryo (default), no need to update draft
    if (!isEditingTransferDate) {
      setTransferEmbryoDayDraft('day5');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, transferDateStr, transferEmbryoDayStr, matchedProfile?.transfer_date, matchedProfile?.transfer_embryo_day, isEditingTransferDate]);

  // Trigger: when Current_Weeks >= 10 → popup (only once)
  useEffect(() => {
    const run = async () => {
      if (!pregnancyMetrics?.isGraduated) return;
      const uid = user?.id || 'guest';
      const key = `graduation_prompt_shown_${uid}`;
      const already = await AsyncStorageLib.getItem(key);
      if (already === 'true') return;
      Alert.alert('Congratulations!', 'Congratulations! Transfer to OB/GYN recommended.');
      await AsyncStorageLib.setItem(key, 'true');
    };
    run().catch((e) => console.warn('Graduation prompt error:', e));
  }, [pregnancyMetrics?.isGraduated, user?.id]);

  const saveTransferDate = useCallback(async () => {
    const v = String(transferDateDraft || '').trim();
    // Parse MM/DD/YY format
    const parsed = parseMMDDYYToISO(v);
    if (!parsed) {
      Alert.alert('Invalid Format', 'Please enter transfer date in format: MM/DD/YY (e.g., 12/01/25).');
      return;
    }
    // Convert to ISO format (YYYY-MM-DD) for storage
    const isoDate = formatDateToISO(parsed);
    // Always use Day 5 embryo (default)
    const embryoKey = 'day5';
    
    console.log('💾 Saving transfer date:', { isoDate, embryoKey });
    
    setSavingTransferDate(true);
    try {
      // Store on current user object (local) so HomeScreen can compute immediately
      const res = await updateProfile?.({ transfer_date: isoDate, transfer_embryo_day: embryoKey });
      if (res?.success === false) {
        console.error('❌ Save failed:', res?.error);
        Alert.alert('Save Failed', res?.error || 'Failed to save transfer date. Please try again.');
        return;
      }
      console.log('✅ Save successful:', { 
        transfer_date: res?.user?.transfer_date,
        transfer_embryo_day: res?.user?.transfer_embryo_day,
      });
      Alert.alert(t('common.success') || 'Saved', t('home.transferDateSaved') || 'Transfer date saved.');
    } catch (e) {
      console.error('❌ Save transfer_date error:', e);
      Alert.alert('Save Failed', 'Failed to save transfer date. Please try again.');
    } finally {
      setSavingTransferDate(false);
    }
  }, [transferDateDraft, transferEmbryoDayDraft, updateProfile]);

  // Embryo type is now always Day 5, no need for saveEmbryoDay function

  const renderPregnancyDashboard = () => {
    const currentStageKey = getCurrentStageKey();
    const shouldShow =
      currentStageKey === 'pregnancy' ||
      !!pregnancyMetrics ||
      (!!transferDateDraft && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(transferDateDraft));

    if (!shouldShow) return null;

    if (!pregnancyMetrics) {
      // Parent users can see but not edit
      if (isParentRole) {
      return (
        <View style={styles.pregDashboardCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Icon name="calendar" size={24} color="#1F6FE0" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Transfer Date</Text>
                <Text style={styles.cardSubtitle}>
                  {matchedProfile?.name ? `Waiting for ${matchedProfile.name} to set transfer date` : 'Waiting for surrogate to set transfer date'}
          </Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <Icon name="info" size={16} color="#1E40AF" />
              <Text style={styles.infoText}>
                The transfer date will be set by your matched surrogate. Once set, you'll be able to track the pregnancy progress here.
              </Text>
            </View>
          </View>
        );
      }
      
      // Surrogate users can set the date
      return (
        <View style={styles.pregDashboardCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Icon name="calendar" size={24} color="#1F6FE0" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Set Transfer Date</Text>
              <Text style={styles.cardSubtitle}>Start tracking your pregnancy journey</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Transfer Date (MM/DD/YY)</Text>
          <View style={styles.inputContainer}>
            <Icon name="calendar" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              value={transferDateDraft}
              onChangeText={setTransferDateDraft}
              placeholder="e.g. 12/01/25"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              style={styles.fancyInput}
            />
          </View>
          <Text style={styles.helperText}>
            Enter the date when the transfer procedure took place.
          </Text>


            <TouchableOpacity
            style={[styles.fullWidthButton, savingTransferDate && styles.fullWidthButtonDisabled]}
              onPress={saveTransferDate}
              disabled={savingTransferDate}
              activeOpacity={0.8}
            >
              {savingTransferDate ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
              <Text style={styles.buttonText}>{t('home.saveAndStartTracking')}</Text>
              )}
            </TouchableOpacity>
        </View>
      );
    }

    const { weeks, days, daysToDue, progress, isGraduated, embryoKey } = pregnancyMetrics;
    const daysLeftText = daysToDue >= 0 ? `${daysToDue} days` : '0 days';
    const progressPct = `${Math.round(progress * 100)}%`;

    return (
      <View style={styles.pregDashboardCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="heart" size={24} color="#10B981" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('home.currentProgress')}</Text>
            <Text style={styles.cardSubtitle}>
              {weeks} {t('home.weeks')} {days} {t('home.days')}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.pregDashboardBadge}>
            <Text style={styles.pregDashboardBadgeText}>{progressPct}</Text>
          </View>
          {isSurrogateRole && !isEditingTransferDate && (
            <TouchableOpacity
              onPress={() => {
                setIsEditingTransferDate(true);
                // Initialize draft with current values when entering edit mode
                if (transferDateStr) {
                  const formatted = formatISOToMMDDYY(transferDateStr);
                  setTransferDateDraft(formatted);
                }
                // Always use Day 5
                setTransferEmbryoDayDraft('day5');
              }}
              style={styles.editButton}
            >
              <Icon name="edit-2" size={18} color="#1F6FE0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Edit Transfer Date Section - Only for surrogates */}
        {isSurrogateRole && isEditingTransferDate && (
          <View style={styles.editTransferDateSection}>
            <View style={styles.editSectionHeader}>
              <Text style={styles.editSectionTitle}>{t('home.editTransferDate')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsEditingTransferDate(false);
                  // Reset draft to current value
                  if (transferDateStr) {
                    const formatted = formatISOToMMDDYY(transferDateStr);
                    setTransferDateDraft(formatted);
                  }
                }}
                style={styles.cancelEditButton}
              >
                <Icon name="x" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>{t('home.transferDate')} (MM/DD/YY)</Text>
            <View style={styles.inputContainer}>
              <Icon name="calendar" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                value={transferDateDraft}
                onChangeText={setTransferDateDraft}
                placeholder="e.g. 12/01/25"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={styles.fancyInput}
              />
            </View>

            <View style={styles.editButtonRow}>
              <TouchableOpacity
                style={[styles.editCancelButton, { marginRight: 8 }]}
                onPress={() => {
                  setIsEditingTransferDate(false);
                  // Reset draft to current value
                  if (transferDateStr) {
                    const formatted = formatISOToMMDDYY(transferDateStr);
                    setTransferDateDraft(formatted);
                  }
                }}
              >
                <Text style={styles.editCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveButton, savingTransferDate && styles.fullWidthButtonDisabled]}
                onPress={async () => {
                  await saveTransferDate();
                  setIsEditingTransferDate(false);
                }}
                disabled={savingTransferDate}
                activeOpacity={0.8}
              >
                {savingTransferDate ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Display Transfer Date - When not editing */}
        {(!isSurrogateRole || !isEditingTransferDate) && transferDateStr && (
          <View style={styles.transferDateDisplay}>
            <Text style={styles.sectionLabel}>{t('home.transferDate')}</Text>
            <Text style={styles.transferDateValue}>
              {formatISOToMMDDYY(transferDateStr)}
            </Text>
          </View>
        )}

        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>{t('home.dueDateCountdown')}</Text>
            <Text style={[styles.sectionLabel, { color: '#1F6FE0' }]}>{daysLeftText}</Text>
          </View>
        <View style={styles.pregProgressTrack}>
          <View style={[styles.pregProgressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        {isGraduated && (
          <View style={styles.pregGraduationBanner}>
            <Text style={styles.pregGraduationText}>{t('home.congratulationsGraduation')}</Text>
          </View>
        )}

        {/* Points Display - Only for surrogates */}
        {isSurrogateRole && (
          <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <View style={styles.pointsIconContainer}>
                <Icon name="star" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.pointsLabel}>{t('home.myPoints')}</Text>
            </View>
            {loadingPoints ? (
              <ActivityIndicator size="small" color="#1F6FE0" style={{ marginVertical: 8 }} />
            ) : (
              <Text style={styles.pointsValue}>{userPoints.toLocaleString()} {t('home.points')}</Text>
            )}
            <Text style={styles.pointsDescription}>{t('home.pointsDescription')}</Text>
            <Text style={[styles.pointsDescription, { marginTop: 4, fontWeight: '600' }]}>
              {t('points.pointsGoal')}
            </Text>
            <Text style={[styles.pointsDescription, { marginTop: 2, fontSize: 11 }]}>
              {t('points.pointsPerCheckin')}
            </Text>
            {userPoints >= 5000 && (
              <View style={styles.achievementBadge}>
                <Text style={styles.achievementText}>
                  🎊 {t('points.fullParticipationAchieved').split('!')[0]}!
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.fullWidthButton}
          onPress={() => {
            if (isParentRole) {
              Alert.alert(t('home.restricted'), t('home.onlySurrogatesCanPost'));
              return;
            }
            showImagePicker();
          }}
          activeOpacity={0.85}
        >
          <Icon name="upload" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>{t('home.uploadWeeklyReport')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Surrogate updates own stage (writes to profiles.progress_stage)
  const updateSurrogateStage = useCallback(
    async (nextStage) => {
      const normalized = normalizeStage(nextStage);
      if (!isSurrogateRole || !user?.id) return;
      if (!STAGE_ORDER.includes(normalized)) {
        Alert.alert('Invalid stage', 'Please select a valid stage.');
        return;
      }
      try {
        setStageUpdateLoading(true);
        
        // Get current stage before updating
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('progress_stage')
          .eq('id', user.id)
          .single();
        
        const oldStage = currentProfile?.progress_stage || null;
        
        const { error } = await supabase
          .from('profiles')
          .update({ progress_stage: normalized, stage_updated_by: 'surrogate' })
          .eq('id', user.id);
        if (error) {
          console.log('Error updating stage (surrogate):', error.message);
          Alert.alert('Update failed', 'Could not update stage. Please try again.');
          return;
        }
        
        // Send notification to matched parent if stage changed
        // Note: The notification will be sent via Supabase Realtime listener
        // The parent's app will detect the change and show a notification
        // We don't need to call an API here since Realtime handles it
        console.log('✅ Surrogate stage updated, parent will be notified via Realtime');
        
        // Sync local state/refs immediately
        realStageRef.current = normalized;
        stageDataReadyRef.current = true;
        setServerStage(normalized);
        setPostStage(normalized);
        setStageLoaded(true);
        setStageVersion((v) => v + 1);
        // Get the display label for the stage
        const stageOption = STAGE_OPTIONS.find(opt => opt.key === normalized);
        const stageLabel = stageOption ? stageOption.label : normalized;
        Alert.alert('Stage updated', `Your stage is now set to ${stageLabel}.`);
        console.log('✅ Surrogate stage updated', { stage: normalized, label: stageLabel });
      } catch (e) {
        console.log('Error updating stage (surrogate):', e.message);
        Alert.alert('Update failed', 'Could not update stage. Please try again.');
      } finally {
        setStageUpdateLoading(false);
      }
    },
    [isSurrogateRole, user?.id]
  );

  // 设置当前用户ID当用户登录时
  useEffect(() => {
    if (user?.id && currentUserId !== user.id) {
      console.log('Setting current user in AppContext:', user.id);
      setCurrentUser(user.id);
    }
  }, [user, currentUserId, setCurrentUser]);

  // Fetch current stage from backend (admin-controlled)
  // WAIT for authLoading to complete before fetching stage
  // This ensures user data is fully ready
  useEffect(() => {
    // Still waiting for auth to complete - don't do anything yet
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting before fetchStage...');
      return;
    }

    let cancelled = false;

    const fetchMatchAndStage = async () => {
      // Calculate role inside the function to ensure we have latest values
      const currentRole = (user?.role || '').toLowerCase();
      const isSurrogate = currentRole === 'surrogate';
      const isParent = currentRole === 'parent';
      
      console.log('🔄 fetchStage start', { 
        userId: user?.id, 
        role: user?.role,
        isSurrogate,
        isParent,
        authLoading 
      });

      // No user - guest mode
      if (!user?.id) {
        if (!cancelled) {
          realStageRef.current = 'pre';
          realMatchIdRef.current = null;
          stageDataReadyRef.current = true;
          setServerStage('pre');
          setPostStage('pre');
          setMatchedSurrogateId(null);
          setMatchedProfile(null);
          setStageLoaded(true);
          console.log('✅ fetchStage done (guest)', { stage: 'pre' });
        }
        return;
      }

      try {
        // Surrogate: read own profile.progress_stage
        if (isSurrogate) {
          const { data, error } = await supabase
            .from('profiles')
            .select('progress_stage')
            .eq('id', user.id)
            .maybeSingle();
          if (error) console.log('Error loading progress_stage (surrogate):', error.message);
          const stage = data?.progress_stage || 'pre';
          if (!cancelled) {
            // Update ref FIRST (synchronous)
            realStageRef.current = stage;
            stageDataReadyRef.current = true;
            // Then update state
            setServerStage(stage);
            setPostStage(stage);
            setStageLoaded(true);
            console.log('✅ fetchStage done (surrogate)', { stage, refStage: realStageRef.current });
          }
          return;
        }

        // Parent: fetch match first, then get surrogate's stage
        if (isParent) {
          console.log('🔄 Parent: fetching matched surrogate...');
          setMatchCheckInProgress(true);
          
          let surrogateId = null;
          try {
            const { data: parentMatches, error: parentMatchError } = await supabase
              .from('surrogate_matches')
              .select('surrogate_id')
              .eq('parent_id', user.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1);
            if (parentMatchError) {
              console.log('Error loading match by parent_id:', parentMatchError.message);
            }
            surrogateId = parentMatches?.[0]?.surrogate_id || null;
          } catch (matchErr) {
            console.error('Error fetching match:', matchErr);
          }

          if (cancelled) return;

          // Update ref FIRST (synchronous)
          realMatchIdRef.current = surrogateId;
          // Update matched state
          setMatchedSurrogateId(surrogateId);
          if (surrogateId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', surrogateId)
              .single();
            if (!cancelled) {
              console.log('📥 Fetched matched surrogate profile:', {
                transfer_date: profile?.transfer_date,
                transfer_embryo_day: profile?.transfer_embryo_day,
                name: profile?.name,
              });
              setMatchedProfile(profile);
            }
          } else {
            setMatchedProfile(null);
          }
          setMatchCheckInProgress(false);

          console.log('Matched surrogate for parent:', surrogateId);

          // Now fetch stage based on match
          if (surrogateId) {
            const { data, error } = await supabase
              .from('profiles')
              .select('progress_stage')
              .eq('id', surrogateId)
              .maybeSingle();
            if (error) console.log('Error loading progress_stage (parent):', error.message);
            const stage = data?.progress_stage || 'pre';
            if (!cancelled) {
              // Update ref FIRST (synchronous)
              realStageRef.current = stage;
              stageDataReadyRef.current = true;
              setServerStage(stage);
              setPostStage(stage);
              setStageLoaded(true);
              console.log('✅ fetchStage done (parent matched)', { stage, matchedSurrogateId: surrogateId, refStage: realStageRef.current });
            }
          } else {
            // No match - default to pre
            if (!cancelled) {
              realStageRef.current = 'pre';
              stageDataReadyRef.current = true;
              setServerStage('pre');
              setPostStage('pre');
              setStageLoaded(true);
              console.log('✅ fetchStage done (parent no match)', { stage: 'pre' });
            }
          }
          return;
        }

        // Fallback for unknown role
        if (!cancelled) {
          realStageRef.current = 'pre';
          stageDataReadyRef.current = true;
          setServerStage('pre');
          setPostStage('pre');
          setStageLoaded(true);
          console.log('✅ fetchStage done (fallback)', { stage: 'pre' });
        }
      } catch (e) {
        console.log('Error in fetchMatchAndStage:', e.message);
        if (!cancelled) {
          realStageRef.current = 'pre';
          stageDataReadyRef.current = true;
          setServerStage('pre');
          setPostStage('pre');
          setStageLoaded(true);
        }
      }
    };

    fetchMatchAndStage();
    return () => { cancelled = true; };
  // Only depend on authLoading and user?.id - role is derived from user
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // 当用户登录时，如果还在加载状态，强制完成加载
  useEffect(() => {
    if (user?.id && isLoading) {
      console.log('User is logged in but app is still loading, forcing completion');
      // 给一个短暂的延迟，让数据加载有机会完成
      const timer = setTimeout(() => {
        forceCompleteLoading();
      }, 2000); // 2秒后强制完成加载
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, forceCompleteLoading]);

  // Listen for surrogate progress stage updates (for parent users)
  useEffect(() => {
    if (!isParentRole || !matchedSurrogateId) {
      return;
    }

    console.log('[HomeScreen] Setting up listener for surrogate progress (parent):', matchedSurrogateId);

    // Stage labels mapping
    const stageLabels = {
      'pre': 'Pre-Transfer',
      'pregnancy': 'Post-Transfer',
      'ob_visit': 'OB Office Visit',
      'delivery': 'Delivery',
    };

    // Track previous stage to detect changes
    let previousStage = serverStage;
    let realtimeSubscribed = false;

    // Method 1: Try Supabase Realtime first
    const channel = supabase
      .channel(`surrogate-progress-${matchedSurrogateId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${matchedSurrogateId}`,
        },
        (payload) => {
          console.log('[HomeScreen] ✅ Surrogate profile updated via Realtime:', payload);
          
          const newStage = payload.new?.progress_stage;
          const oldStage = previousStage;
          
          if (newStage && newStage !== oldStage && oldStage) {
            console.log('[HomeScreen] ✅ Stage changed detected! Sending notification:', { oldStage, newStage });
            
            previousStage = newStage;
            realStageRef.current = newStage;
            setServerStage(newStage);
            setPostStage(newStage);
            
            const surrogateName = matchedProfile?.name || 'Your surrogate';
            sendSurrogateProgressUpdate(surrogateName, oldStage, newStage, stageLabels);
          } else if (newStage && newStage !== oldStage) {
            previousStage = newStage;
            realStageRef.current = newStage;
            setServerStage(newStage);
            setPostStage(newStage);
          }
        }
      )
      .subscribe((status) => {
        console.log('[HomeScreen] Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          realtimeSubscribed = true;
          console.log('[HomeScreen] ✅ Successfully subscribed to Realtime updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[HomeScreen] ⚠️ Realtime not available, falling back to polling');
          realtimeSubscribed = false;
        }
      });

    // Method 2: Fallback polling if Realtime doesn't work
    // Poll every 10 seconds to check for stage changes
    const pollInterval = setInterval(async () => {
      if (realtimeSubscribed) {
        // Realtime is working, skip polling
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('progress_stage, name')
          .eq('id', matchedSurrogateId)
          .single();

        if (error) {
          console.error('[HomeScreen] Error polling surrogate stage:', error);
          return;
        }

        const newStage = data?.progress_stage;
        const currentStage = previousStage || serverStage;

        if (newStage && newStage !== currentStage && currentStage) {
          console.log('[HomeScreen] ✅ Stage changed detected via polling! Sending notification:', {
            oldStage: currentStage,
            newStage,
          });

          previousStage = newStage;
          realStageRef.current = newStage;
          setServerStage(newStage);
          setPostStage(newStage);

          const surrogateName = data?.name || matchedProfile?.name || 'Your surrogate';
          sendSurrogateProgressUpdate(surrogateName, currentStage, newStage, stageLabels);
        }
      } catch (error) {
        console.error('[HomeScreen] Error in polling:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      console.log('[HomeScreen] Cleaning up listeners');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [isParentRole, matchedSurrogateId, matchedProfile, serverStage, sendSurrogateProgressUpdate]);

  // Listen for own stage updates (for surrogate users)
  useEffect(() => {
    if (!isSurrogateRole || !user?.id) {
      return;
    }

    console.log('[HomeScreen] Setting up listener for own stage updates (surrogate):', user.id);

    // Stage labels mapping
    const stageLabels = {
      'pre': 'Pre-Transfer',
      'pregnancy': 'Post-Transfer',
      'ob_visit': 'OB Office Visit',
      'delivery': 'Delivery',
    };

    // Track previous stage to detect changes
    let previousStage = serverStage;
    let realtimeSubscribed = false;

    // Method 1: Try Supabase Realtime first
    const channel = supabase
      .channel(`surrogate-own-progress-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[HomeScreen] ✅ Own profile updated via Realtime:', payload);
          
          const newStage = payload.new?.progress_stage;
          const oldStage = previousStage;
          const updatedBy = payload.new?.stage_updated_by;
          
          // Only notify if stage changed and it was updated by admin (not by self)
          if (newStage && newStage !== oldStage && oldStage && updatedBy === 'admin') {
            console.log('[HomeScreen] ✅ Stage changed by admin! Sending notification:', { oldStage, newStage });
            
            previousStage = newStage;
            realStageRef.current = newStage;
            setServerStage(newStage);
            setPostStage(newStage);
            
            const surrogateName = user?.name || 'You';
            sendSurrogateProgressUpdate(surrogateName, oldStage, newStage, stageLabels);
          } else if (newStage && newStage !== oldStage) {
            // Stage changed but by self, just update state without notification
            console.log('[HomeScreen] Stage changed by self, updating state only');
            previousStage = newStage;
            realStageRef.current = newStage;
            setServerStage(newStage);
            setPostStage(newStage);
          }
        }
      )
      .subscribe((status) => {
        console.log('[HomeScreen] Realtime subscription status (surrogate own):', status);
        if (status === 'SUBSCRIBED') {
          realtimeSubscribed = true;
          console.log('[HomeScreen] ✅ Successfully subscribed to own stage updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[HomeScreen] ⚠️ Realtime not available, falling back to polling');
          realtimeSubscribed = false;
        }
      });

    // Method 2: Fallback polling if Realtime doesn't work
    const pollInterval = setInterval(async () => {
      if (realtimeSubscribed) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('progress_stage, stage_updated_by, name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[HomeScreen] Error polling own stage:', error);
          return;
        }

        const newStage = data?.progress_stage;
        const currentStage = previousStage || serverStage;
        const updatedBy = data?.stage_updated_by;

        // Only notify if stage changed and it was updated by admin
        if (newStage && newStage !== currentStage && currentStage && updatedBy === 'admin') {
          console.log('[HomeScreen] ✅ Stage changed by admin via polling! Sending notification:', {
            oldStage: currentStage,
            newStage,
          });

          previousStage = newStage;
          realStageRef.current = newStage;
          setServerStage(newStage);
          setPostStage(newStage);

          const surrogateName = data?.name || user?.name || 'You';
          sendSurrogateProgressUpdate(surrogateName, currentStage, newStage, stageLabels);
        } else if (newStage && newStage !== currentStage) {
          // Just update state
          previousStage = newStage;
          realStageRef.current = newStage;
          setServerStage(newStage);
          setPostStage(newStage);
        }
      } catch (error) {
        console.error('[HomeScreen] Error in polling own stage:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      console.log('[HomeScreen] Cleaning up own stage listeners');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [isSurrogateRole, user?.id, user?.name, serverStage, sendSurrogateProgressUpdate]);

  // Fetch matched surrogate id for parent users (surrogate can skip)
  const fetchMatchedSurrogate = useCallback(async () => {
    console.log('🔄 fetchMatchedSurrogate start', {
      userId: user?.id,
      role: user?.role,
    });
    if (!user?.id || (user?.role || '').toLowerCase() !== 'parent') {
      setMatchedSurrogateId(null);
      setMatchedProfile(null);
      return null;
    }
    setMatchCheckInProgress(true);
    let finalId = null;
    try {
      const { data: parentMatches, error: parentMatchError } = await supabase
        .from('surrogate_matches')
        .select('surrogate_id')
        .eq('parent_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (parentMatchError) {
        console.log('Error loading match by parent_id:', parentMatchError.message);
      }

      finalId = parentMatches?.[0]?.surrogate_id || null;
      setMatchedSurrogateId(finalId);
      if (finalId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', finalId)
          .single();
        console.log('📥 Fetched matched surrogate profile (fetchMatchedSurrogate):', {
          transfer_date: profile?.transfer_date,
          transfer_embryo_day: profile?.transfer_embryo_day,
          name: profile?.name,
        });
        setMatchedProfile(profile);
      } else {
        setMatchedProfile(null);
      }
      console.log('Matched surrogate for parent:', finalId);
    } catch (error) {
      console.error('Error fetching matched surrogate:', error);
      setMatchedSurrogateId(null);
      setMatchedProfile(null);
      finalId = null;
    } finally {
      setMatchCheckInProgress(false);
    }
    console.log('🔄 fetchMatchedSurrogate done', { matchedSurrogateId: finalId });
    return finalId;
  }, [user?.id, user?.role]);

  // Reusable stage refresh function for pull-to-refresh
  const refreshStageData = useCallback(async () => {
    console.log('🔄 refreshStageData start');
    try {
      if (!user?.id) {
        setServerStage('pre');
        setPostStage('pre');
        return;
      }
      if (isSurrogateRole) {
        const { data } = await supabase
          .from('profiles')
          .select('progress_stage')
          .eq('id', user.id)
          .maybeSingle();
        const stage = data?.progress_stage || 'pre';
        setServerStage(stage);
        setPostStage(stage);
        console.log('✅ refreshStageData done (surrogate)', { stage });
        return;
      }
      if (isParentRole) {
        const targetSurrogateId = await fetchMatchedSurrogate();
        if (targetSurrogateId) {
          const { data } = await supabase
            .from('profiles')
            .select('progress_stage')
            .eq('id', targetSurrogateId)
            .maybeSingle();
          const stage = data?.progress_stage || 'pre';
          setServerStage(stage);
          setPostStage(stage);
          console.log('✅ refreshStageData done (parent)', { stage });
        } else {
          setServerStage('pre');
          setPostStage('pre');
        }
      }
    } catch (e) {
      console.log('Error in refreshStageData:', e.message);
    }
  }, [user?.id, isSurrogateRole, isParentRole, fetchMatchedSurrogate]);

  // Fetch medical reports
  const fetchMedicalReports = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingReports(true);
    try {
      // For parent users, fetch matched surrogate's reports
      const targetUserId = isParentRole && matchedSurrogateId ? matchedSurrogateId : user.id;
      
      const { data, error } = await supabase
        .from('medical_reports')
        .select('*')
        .eq('user_id', targetUserId)
        .order('visit_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching medical reports:', error);
        return;
      }
      
      setMedicalReports(data || []);
      console.log('✅ Fetched medical reports:', data?.length || 0);
    } catch (error) {
      console.error('Error in fetchMedicalReports:', error);
    } finally {
      setLoadingReports(false);
    }
  }, [user?.id, isParentRole, matchedSurrogateId]);

  // Fetch user points
  const fetchUserPoints = useCallback(async () => {
    if (!user?.id || !isSurrogateRole) {
      setUserPoints(0);
      return;
    }

    try {
      setLoadingPoints(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user points:', error);
        setUserPoints(0);
      } else {
        setUserPoints(data?.total_points || 0);
      }
    } catch (error) {
      console.error('Error in fetchUserPoints:', error);
      setUserPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  }, [user?.id, isSurrogateRole]);

  // Fetch match and medical information for surrogate
  const fetchMatchAndMedicalInfo = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1312',message:'fetchMatchAndMedicalInfo called',data:{userId:user?.id,isSurrogateRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!user?.id || !isSurrogateRole) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1314',message:'fetchMatchAndMedicalInfo skipped',data:{userId:user?.id,isSurrogateRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setCurrentMatchId(null);
      return;
    }

    setLoadingMedicalInfo(true);
    try {
      // Find the match for this surrogate
      // Use select('*') to avoid errors if columns don't exist yet (migration not run)
      const { data: matchData, error: matchError } = await supabase
        .from('surrogate_matches')
        .select('*')
        .eq('surrogate_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1320',message:'fetchMatchAndMedicalInfo query result',data:{matchError:matchError?.message,matchDataExists:!!matchData,matchId:matchData?.id,hasPregnancyTestDate:!!matchData?.pregnancy_test_date,hasPregnancyTestDate2:!!matchData?.pregnancy_test_date_2,hasPregnancyTestDate3:!!matchData?.pregnancy_test_date_3},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (matchError) {
        console.error('Error fetching match:', matchError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1336',message:'fetchMatchAndMedicalInfo match error',data:{error:matchError.message,code:matchError.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setCurrentMatchId(null);
        return;
      }

      if (matchData) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1341',message:'fetchMatchAndMedicalInfo match found',data:{matchId:matchData.id,hasMedicationDate:!!matchData.medication_start_date},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setCurrentMatchId(matchData.id);
        // Format dates for display (YYYY-MM-DD to MM/DD/YY)
        if (matchData.medication_start_date) {
          const date = new Date(matchData.medication_start_date);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          setMedicationStartDate(`${month}/${day}/${year}`);
        } else {
          setMedicationStartDate('');
        }

        if (matchData.pregnancy_test_date) {
          const date = new Date(matchData.pregnancy_test_date);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          setPregnancyTestDate(`${month}/${day}/${year}`);
        } else {
          setPregnancyTestDate('');
        }

        if (matchData.pregnancy_test_date_2) {
          const date = new Date(matchData.pregnancy_test_date_2);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          setPregnancyTestDate2(`${month}/${day}/${year}`);
        } else {
          setPregnancyTestDate2('');
        }

        if (matchData.pregnancy_test_date_3) {
          const date = new Date(matchData.pregnancy_test_date_3);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          setPregnancyTestDate3(`${month}/${day}/${year}`);
        } else {
          setPregnancyTestDate3('');
        }

        if (matchData.pregnancy_test_date_4) {
          const date = new Date(matchData.pregnancy_test_date_4);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          setPregnancyTestDate4(`${month}/${day}/${year}`);
        } else {
          setPregnancyTestDate4('');
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1365',message:'fetchMatchAndMedicalInfo state set',data:{pregnancyTestDate1:matchData.pregnancy_test_date?`${String(new Date(matchData.pregnancy_test_date).getMonth()+1).padStart(2,'0')}/${String(new Date(matchData.pregnancy_test_date).getDate()).padStart(2,'0')}/${String(new Date(matchData.pregnancy_test_date).getFullYear()).slice(-2)}`:'',pregnancyTestDate2:matchData.pregnancy_test_date_2?`${String(new Date(matchData.pregnancy_test_date_2).getMonth()+1).padStart(2,'0')}/${String(new Date(matchData.pregnancy_test_date_2).getDate()).padStart(2,'0')}/${String(new Date(matchData.pregnancy_test_date_2).getFullYear()).slice(-2)}`:'',pregnancyTestDate3:matchData.pregnancy_test_date_3?`${String(new Date(matchData.pregnancy_test_date_3).getMonth()+1).padStart(2,'0')}/${String(new Date(matchData.pregnancy_test_date_3).getDate()).padStart(2,'0')}/${String(new Date(matchData.pregnancy_test_date_3).getFullYear()).slice(-2)}`:''},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        setFetalBeatConfirm(matchData.fetal_beat_confirm || 'None');
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1399',message:'fetchMatchAndMedicalInfo no match found',data:{userId:user?.id,surrogateId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setCurrentMatchId(null);
        setMedicationStartDate('');
        setPregnancyTestDate('');
        setPregnancyTestDate2('');
        setPregnancyTestDate3('');
        setPregnancyTestDate4('');
        setFetalBeatConfirm('None');
      }
    } catch (error) {
      console.error('Error in fetchMatchAndMedicalInfo:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1418',message:'fetchMatchAndMedicalInfo error',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setCurrentMatchId(null);
    } finally {
      setLoadingMedicalInfo(false);
    }
  }, [user?.id, isSurrogateRole]);

  // Save medical information
  const saveMedicalInfo = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1419',message:'saveMedicalInfo called',data:{userId:user?.id,isSurrogateRole,currentMatchId,loadingMedicalInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    if (!user?.id || !isSurrogateRole || !currentMatchId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1421',message:'saveMedicalInfo validation failed',data:{userId:user?.id,isSurrogateRole,currentMatchId,loadingMedicalInfo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      Alert.alert('Error', 'Please wait for match information to load.');
      return;
    }

    setSavingMedicalInfo(true);
    try {
      const updateData = {};

      // Parse and format medication start date
      if (medicationStartDate.trim()) {
        const parsed = parseMMDDYYToISO(medicationStartDate.trim());
        if (!parsed) {
          Alert.alert('Invalid Format', 'Please enter medication start date in format: MM/DD/YY (e.g., 12/01/25).');
          setSavingMedicalInfo(false);
          return;
        }
        updateData.medication_start_date = formatDateToISO(parsed);
      } else {
        updateData.medication_start_date = null;
      }

      // Parse and format pregnancy test date
      if (pregnancyTestDate.trim()) {
        const parsed = parseMMDDYYToISO(pregnancyTestDate.trim());
        if (!parsed) {
          Alert.alert('Invalid Format', 'Please enter HCG test date in format: MM/DD/YY (e.g., 12/01/25).');
          setSavingMedicalInfo(false);
          return;
        }
        updateData.pregnancy_test_date = formatDateToISO(parsed);
      } else {
        updateData.pregnancy_test_date = null;
      }

      // Parse and format pregnancy test date 2
      if (pregnancyTestDate2.trim()) {
        const parsed = parseMMDDYYToISO(pregnancyTestDate2.trim());
        if (!parsed) {
          Alert.alert('Invalid Format', 'Please enter HCG test date 2 in format: MM/DD/YY (e.g., 12/15/25).');
          setSavingMedicalInfo(false);
          return;
        }
        updateData.pregnancy_test_date_2 = formatDateToISO(parsed);
      } else {
        updateData.pregnancy_test_date_2 = null;
      }

      // Parse and format pregnancy test date 3
      if (pregnancyTestDate3.trim()) {
        const parsed = parseMMDDYYToISO(pregnancyTestDate3.trim());
        if (!parsed) {
          Alert.alert('Invalid Format', 'Please enter HCG test date 3 in format: MM/DD/YY (e.g., 12/20/25).');
          setSavingMedicalInfo(false);
          return;
        }
        updateData.pregnancy_test_date_3 = formatDateToISO(parsed);
      } else {
        updateData.pregnancy_test_date_3 = null;
      }

      // Parse and format pregnancy test date 4
      if (pregnancyTestDate4.trim()) {
        const parsed = parseMMDDYYToISO(pregnancyTestDate4.trim());
        if (!parsed) {
          Alert.alert('Invalid Format', 'Please enter HCG test date 4 in format: MM/DD/YY (e.g., 12/25/25).');
          setSavingMedicalInfo(false);
          return;
        }
        updateData.pregnancy_test_date_4 = formatDateToISO(parsed);
      } else {
        updateData.pregnancy_test_date_4 = null;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:1465',message:'saveMedicalInfo updateData prepared',data:{hasPregnancyTestDate:!!updateData.pregnancy_test_date,hasPregnancyTestDate2:!!updateData.pregnancy_test_date_2,hasPregnancyTestDate3:!!updateData.pregnancy_test_date_3,currentMatchId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Fetal beat confirm
      updateData.fetal_beat_confirm = fetalBeatConfirm || 'None';
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('surrogate_matches')
        .update(updateData)
        .eq('id', currentMatchId)
        .eq('surrogate_id', user.id);

      if (error) {
        console.error('Error updating medical info:', error);
        Alert.alert('Error', 'Failed to save medical information. Please try again.');
        return;
      }

      Alert.alert('Success', 'Medical information saved successfully.');
    } catch (error) {
      console.error('Error in saveMedicalInfo:', error);
      Alert.alert('Error', 'Failed to save medical information. Please try again.');
    } finally {
      setSavingMedicalInfo(false);
    }
  }, [user?.id, isSurrogateRole, currentMatchId, medicationStartDate, pregnancyTestDate, pregnancyTestDate2, pregnancyTestDate3, pregnancyTestDate4, fetalBeatConfirm]);

  // Fetch medical reports on mount and when user/match changes
  useEffect(() => {
    if (user?.id) {
      fetchMedicalReports();
      fetchUserPoints();
      if (isSurrogateRole) {
        fetchMatchAndMedicalInfo();
      }
    }
  }, [user?.id, matchedSurrogateId, fetchMedicalReports, fetchUserPoints, isSurrogateRole, fetchMatchAndMedicalInfo]);

  // 下拉刷新：刷新帖子 + 重新拉取匹配 + 阶段 + 医疗报告 + 积分
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshData(),
        refreshStageData(),
        fetchMedicalReports(),
        fetchUserPoints(),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData, refreshStageData, fetchMedicalReports, fetchUserPoints]);

  // Helper function to recursively count all comments and replies
  const countAllComments = (comments) => {
    let count = 0;
    comments.forEach(comment => {
      count += 1; // Count this comment
      if (comment.replies && comment.replies.length > 0) {
        count += countAllComments(comment.replies); // Recursively count replies
      }
    });
    return count;
  };

  // Update current user in AppContext when user changes
  React.useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
    }
  }, [user?.id]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Required', 'We need camera and photo library permissions to share photos and videos.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setShowModal(true);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setShowModal(true);
    }
  };

  const recordVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setShowModal(true);
    }
  };

  const showImagePicker = () => {
    if (isParentRole) {
      Alert.alert('Restricted', 'Only surrogates can create posts.');
      return;
    }
    const currentStage = getCurrentStageKey();
    setPostStage(currentStage);
    const status = getStageStatus(currentStage);
    if (status !== 'current') {
      Alert.alert('Locked', 'You can only post in the current stage.');
      return;
    }
    // 直接打开发帖窗口
    setShowModal(true);
  };

  const publishPost = async () => {
    if (isParentRole) {
      Alert.alert('Restricted', 'Only surrogates can create posts.');
      return;
    }
    // 验证：至少要有文字或图片/视频
    if (!postText.trim() && !selectedImage) {
      Alert.alert('Error', 'Please add some text or media to your post.');
      return;
    }
    const currentStage = getCurrentStageKey();
    setPostStage(currentStage);
    const status = getStageStatus(currentStage);
    if (status !== 'current') {
      Alert.alert('Locked', 'You can only post in the current stage.');
      return;
    }

    let mediaUri = null;
    let mediaType = null;

    if (selectedImage) {
      // 检测是否为视频文件
      const isVideo = selectedImage.type === 'video' || 
                     selectedImage.uri.includes('.mp4') || 
                     selectedImage.uri.includes('.mov') ||
                     selectedImage.uri.includes('.avi');
      
      mediaUri = selectedImage.uri;
      mediaType = isVideo ? 'video' : 'image';
    }

    const newPost = {
      content: postText.trim(),
      mediaUri: mediaUri,
      mediaType: mediaType,
      userName: user?.name || 'Surrogate Member',
      userId: user?.id || 'guest',
      stage: normalizeStage(currentStage || 'pregnancy'),
    };

    try {
      setIsPublishing(true);
      setUploadProgress(0);
      setUploadStatus(mediaUri ? 'Preparing upload...' : 'Publishing...');
      
      // 传递上传进度回调
      await addPost(newPost, (progress, status) => {
        setUploadProgress(progress);
        setUploadStatus(status);
      });
      
      setShowModal(false);
      setSelectedImage(null);
      setPostText('');
      setPostStage(getCurrentStageKey());
      setUploadProgress(0);
      setUploadStatus('');
      Alert.alert('Success', 'Your post has been published!');
    } catch (error) {
      console.error('Publish error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to publish post.\n\n';
      if (error.message) {
        errorMessage += `Error: ${error.message}\n`;
      }
      if (error.code) {
        errorMessage += `Code: ${error.code}\n`;
      }
      if (error.details) {
        errorMessage += `Details: ${error.details}\n`;
      }
      if (error.hint) {
        errorMessage += `Hint: ${error.hint}`;
      }
      
      Alert.alert('Publish Error', errorMessage);
    } finally {
      setIsPublishing(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleComment = (postId) => {
    setSelectedPostForComment(postId);
    setReplyToComment(null);
    setShowCommentModal(true);
  };

  const handleReply = (postId, comment) => {
    setSelectedPostForComment(postId);
    setReplyToComment(comment);
    setShowCommentModal(true);
  };

  const submitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      await addComment(
        selectedPostForComment, 
        commentText, 
        user?.name || 'Anonymous',
        user?.id || 'guest',
        replyToComment?.id || null
      );
      setCommentText('');
      setReplyToComment(null);
      setShowCommentModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment. Please try again.');
      console.error('Comment error:', error);
    }
  };

  // Recursive function to render comments and nested replies
  const renderCommentItem = (comment, depth = 0) => {
    const isOwnComment = comment.userId === user?.id;
    const isLikedComment = likedComments?.has(comment.id);
    const indentStyle = depth > 0 ? { marginLeft: Math.min(depth * 24, 72) } : {};
    
    return (
      <View key={comment.id}>
        <View style={[styles.commentItem, indentStyle]}>
          <View style={styles.commentHeader}>
            <Avatar name={comment.userName} size={32} />
            <View style={[styles.commentInfo, { marginLeft: 10 }]}>
              <Text style={styles.commentUserNameBold}>{comment.userName}</Text>
              <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
            </View>
            {isOwnComment && (
              <TouchableOpacity 
                onPress={() => handleDeleteComment(selectedPostForComment, comment.id)}
                style={styles.commentDeleteButton}
              >
                <Text style={styles.deleteIconSmall}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentTextFull}>{comment.text}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity 
              style={styles.commentLikeButton}
              onPress={() => handleCommentLike(selectedPostForComment, comment.id)}
            >
              <Text style={styles.commentLikeIcon}>{isLikedComment ? '❤️' : '🤍'}</Text>
              <Text style={[styles.commentLikeText, isLikedComment && styles.commentLikedText]}>
                {comment.likes > 0 ? comment.likes : ''} {comment.likes === 1 ? 'Like' : 'Likes'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => handleReply(selectedPostForComment, comment)}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Recursively render all nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View>
            {comment.replies.map((reply) => renderCommentItem(reply, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  const handleDeletePost = (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePost(postId, user?.id);
            Alert.alert('Success', 'Post deleted successfully');
          }
        }
      ]
    );
  };

  const handleDeleteComment = (postId, commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteComment(postId, commentId, user?.id);
          }
        }
      ]
    );
  };

  const handleShare = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      
      // 兼容新旧数据结构
      const postContent = post.content || post.text;
      const postMedia = post.mediaUri || post.image;
      const postMediaType = post.mediaType || post.type;
      
      let shareMessage = '📱 Check out this post from Surrogate Community!\n\n';
      
      if (postContent) {
        shareMessage += `${postContent}\n\n`;
      }
      
      shareMessage += `Shared from BabyTree Surrogacy Community`;

      const shareOptions = [];

      shareOptions.push({
        text: '📋 Copy Text Only',
        onPress: async () => {
          await Clipboard.setStringAsync(shareMessage);
          Alert.alert('Copied!', 'Text content copied to clipboard. You can now paste it in any messaging app.');
        },
      });

      shareOptions.push({
        text: '📤 Share via Other Apps',
        onPress: async () => {
          try {
            await Share.share({
              message: shareMessage,
              title: 'Share Community Post',
            });
          } catch (error) {
            console.error('Share error:', error);
            await Clipboard.setStringAsync(shareMessage);
            Alert.alert('Copied!', 'Share failed. Content copied to clipboard instead.');
          }
        },
      });

      shareOptions.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert(
        'Share Post',
        postMedia 
          ? 'Note: Media files are stored in the cloud. You can copy the text or share via other apps:'
          : 'Choose how to share:',
        shareOptions
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to share post');
      console.error('Share error:', error);
    }
  };

  // Events功能已移到EventScreen中



  const renderPost = (post) => {
    const postComments = getComments(post.id);
    const totalCommentCount = countAllComments(postComments);
    const isOwnPost = post.userId === user?.id;
    
    // Use ref values for immediate access (no state batching delay)
    const currentStageFromRef = realStageRef.current;
    const matchIdFromRef = realMatchIdRef.current;
    const dataReady = stageDataReadyRef.current;
    
    // Calculate stage status using ref values
    const postStageNorm = normalizeStage(post.stage || 'pregnancy');
    const currentStageNorm = normalizeStage(currentStageFromRef);
    const postIdx = STAGE_ORDER.indexOf(postStageNorm);
    const currentIdx = STAGE_ORDER.indexOf(currentStageNorm);
    
    let stageStatus;
    if (isParentRole && !matchIdFromRef) {
      // Unmatched parent: only pre is "current", rest is future
      stageStatus = postStageNorm === 'pre' ? 'current' : 'future';
    } else if (postIdx === -1 || currentIdx === -1) {
      stageStatus = 'future';
    } else if (postIdx < currentIdx) {
      stageStatus = 'past';
    } else if (postIdx === currentIdx) {
      stageStatus = 'current';
    } else {
      stageStatus = 'future';
    }
    
    // isReadOnly logic:
    // - If data not ready yet, default to read-only (safe default)
    // - Parent can only interact with posts in the CURRENT stage
    // - Surrogate can interact with own posts in CURRENT stage
    // - Past stages are read-only for everyone
    // - Future stages are locked
    const isReadOnly = !dataReady || stageStatus !== 'current';
    const isLockedFuture = stageStatus === 'future';
    
    console.log('Post render', {
      postId: post.id,
      postStage: post.stage,
      postStageNorm,
      currentStageFromRef,
      currentStageNorm,
      stageStatus,
      isParentRole,
      isSurrogateRole,
      isReadOnly,
      matchIdFromRef,
      dataReady,
    });
    
    // 兼容新旧数据结构
    const postContent = post.content || post.text;
    const postMedia = post.mediaUri || post.image;
    const postMediaType = post.mediaType || post.type;
    
    return (
    <View key={post.id} style={styles.postCard}>
      <View style={styles.postHeader}>
          <Avatar name={post.userName || 'Surrogate Member'} size={44} style={styles.userAvatar} />
        <View style={styles.postInfo}>
            <Text style={styles.userName}>{post.userName || 'Surrogate Member'}</Text>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
        </View>
          {isOwnPost && !isReadOnly && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeletePost(post.id)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
      </View>
      
        {postContent ? <Text style={styles.postText}>{postContent}</Text> : null}
      
        {postMedia && postMediaType === 'video' ? (
        <VideoPlayer
          source={{ uri: postMedia }}
          style={styles.postVideo}
        />
        ) : postMedia ? (
          <Image source={{ uri: postMedia }} style={styles.postImage} />
      ) : null}
        
        {/* Comments preview */}
        {totalCommentCount > 0 && (
          <View style={styles.commentsPreview}>
            <Text style={styles.commentsCount}>{totalCommentCount} comment{totalCommentCount > 1 ? 's' : ''}</Text>
            <View style={styles.latestComment}>
              <Text style={styles.commentUserName}>{postComments[postComments.length - 1].userName}:</Text>
              <Text style={styles.commentText} numberOfLines={1}> {postComments[postComments.length - 1].text}</Text>
            </View>
          </View>
        )}
      
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={[styles.actionButton, isReadOnly && styles.actionButtonDisabled]} 
          onPress={() => {
            if (isReadOnly) {
              Alert.alert('Read-only', 'Only current stage posts can be interacted with.');
              return;
            }
            handleLike(post.id);
          }}
          disabled={isReadOnly}
        >
          <Text style={[
            styles.actionIcon, 
            likedPosts.has(post.id) && styles.likedIcon
          ]}>
            {likedPosts.has(post.id) ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionText}>
              {post.likes > 0 ? post.likes : ''} {post.likes > 1 ? 'Likes' : 'Like'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, isReadOnly && styles.actionButtonDisabled]}
          onPress={() => {
            if (isReadOnly) {
              Alert.alert('Read-only', 'Only current stage posts can be interacted with.');
              return;
            }
            handleComment(post.id);
          }}
          disabled={isReadOnly}
        >
          <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>
              {totalCommentCount > 0 ? totalCommentCount + ' ' : ''}{totalCommentCount > 1 ? 'Comments' : 'Comment'}
            </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleShare(post.id)}
          disabled={isLockedFuture}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  // Community 只显示帖子，不包含 events，并按阶段过滤（大小写不敏感）
  const feedData = useMemo(() => {
    const safePosts = Array.isArray(posts) ? posts : [];
    const normalized = safePosts.map(post => ({
      ...post,
      type: 'post',
      stage: normalizeStage(post.stage || 'pregnancy'),
    }));

    let scoped = normalized;

    if (isSurrogateRole) {
      scoped = normalized.filter(p => p.userId === user?.id);
    } else if (isParentRole) {
      // Parent can only see matched surrogate's posts
      if (matchedSurrogateId) {
        scoped = normalized.filter(p => p.userId === matchedSurrogateId);
      } else {
        scoped = [];
      }
    }

    // 过滤掉未来阶段（锁定/隐藏）
    scoped = scoped.filter(p => getStageStatus(p.stage) !== 'future');

    if (stageFilter === 'all') return scoped;
    const filterStage = normalizeStage(stageFilter);
    return scoped.filter(p => normalizeStage(p.stage) === filterStage);
  }, [posts, stageFilter, user?.id, matchedSurrogateId, isSurrogateRole, isParentRole, getStageStatus]);

  // Key extractor for feed items
  const keyExtractor = useCallback((item) => {
    if (!item?.id) return Math.random().toString();
    return String(item.id);
  }, []);

  const renderItem = useCallback(({ item }) => {
    return renderPost(item);
  }, [likedPosts, user, getComments]);

  // Map stage to medical report stage
  const getMedicalReportStage = useCallback((currentStage) => {
    const stageMap = {
      'pre': 'Pre-Transfer',
      'pregnancy': 'Post-Transfer',
      'ob_visit': 'OBGYN',
      'delivery': 'OBGYN',
    };
    return stageMap[currentStage] || 'Pre-Transfer';
  }, []);

  // Render medical report card
  // Calculate pregnancy weeks at the time of visit
  const calculatePregnancyWeeksAtVisit = useCallback((visitDateStr, transferDateStr, transferEmbryoDayStr) => {
    if (!visitDateStr || !transferDateStr) return null;
    
    const transfer = parseISODateOnlyToLocalMidnight(transferDateStr);
    const visit = parseISODateOnlyToLocalMidnight(visitDateStr);
    
    if (!transfer || !visit) return null;
    
    // Calculate days from transfer to visit
    const diffDaysRaw = Math.floor((visit.getTime() - transfer.getTime()) / (24 * 60 * 60 * 1000));
    const diffDays = Math.max(0, diffDaysRaw);
    
    // Always use Day 5 embryo (default)
    const embryoKey = 'day5';
    const embryoCfg = EMBRYO_DAY_OPTIONS.find((x) => x.key === embryoKey) || EMBRYO_DAY_OPTIONS[0];
    const transferGestationalDays = embryoCfg.transferGestationalDays;
    
    // Calculate gestational days at visit
    const gestationalDays = diffDays + transferGestationalDays;
    const weeks = Math.floor(gestationalDays / 7);
    const days = gestationalDays % 7;
    
    console.log('📊 [calculatePregnancyWeeksAtVisit]', {
      visitDateStr,
      transferDateStr,
      transferEmbryoDayStr,
      embryoKey,
      transferGestationalDays,
      diffDays,
      gestationalDays,
      weeks,
      days,
    });
    
    return { weeks, days, gestationalDays };
  }, []);

  const renderMedicalReport = useCallback((report) => {
    const reportData = report.report_data || {};
    // Parse ISO date string (YYYY-MM-DD) to local date without timezone conversion
    const visitDate = report.visit_date ? parseISODateOnlyToLocalMidnight(report.visit_date) : null;
    const formattedDate = visitDate 
      ? `${String(visitDate.getMonth() + 1).padStart(2, '0')}-${String(visitDate.getDate()).padStart(2, '0')}-${visitDate.getFullYear()}`
      : 'N/A';

    // Calculate pregnancy weeks at visit (only for Post-Transfer and OBGYN stages)
    const pregnancyWeeks = (report.stage === 'Post-Transfer' || report.stage === 'OBGYN') 
      ? calculatePregnancyWeeksAtVisit(report.visit_date, transferDateStr, transferEmbryoDayStr)
      : null;

    // Extract key metrics based on stage
    let keyMetrics = [];
    if (report.stage === 'Pre-Transfer') {
      if (reportData.endometrial_thickness) keyMetrics.push(`${t('medicalReport.endometrial')}: ${reportData.endometrial_thickness} mm`);
      if (reportData.follicle_1_mm) keyMetrics.push(`${t('medicalReport.follicle')} 1: ${reportData.follicle_1_mm}mm`);
      if (reportData.labs && Array.isArray(reportData.labs) && reportData.labs.length > 0) {
        keyMetrics.push(`${t('medicalReport.labs')}: ${reportData.labs.join(', ')}`);
      }
    } else if (report.stage === 'Post-Transfer') {
      if (reportData.beta_hcg || (reportData.labs && Array.isArray(reportData.labs) && reportData.labs.includes('beta_hgc'))) {
        keyMetrics.push(`${t('medicalReport.betaHcg')}: ${reportData.beta_hcg || t('medicalReport.tested')}`);
      }
      if (reportData.fetal_heart_rate) keyMetrics.push(`${t('medicalReport.heartRate')}: ${reportData.fetal_heart_rate} bpm`);
      if (reportData.gestational_sac_diameter) keyMetrics.push(`${t('medicalReport.sac')}: ${reportData.gestational_sac_diameter} mm`);
      if (reportData.gestational_age) keyMetrics.push(`${t('medicalReport.ga')}: ${reportData.gestational_age}`);
    } else if (report.stage === 'OBGYN') {
      if (reportData.weight) keyMetrics.push(`${t('medicalReport.weight')}: ${reportData.weight} lbs`);
      if (reportData.blood_pressure) keyMetrics.push(`${t('medicalReport.bp')}: ${reportData.blood_pressure}`);
      if (reportData.stomach_measurement) keyMetrics.push(`${t('medicalReport.stomach')}: ${reportData.stomach_measurement} cm`);
      if (reportData.fetal_heartbeats) keyMetrics.push(`${t('medicalReport.fhr')}: ${reportData.fetal_heartbeats} bpm`);
      if (reportData.gestational_age) keyMetrics.push(`${t('medicalReport.ga')}: ${reportData.gestational_age}`);
    }

    return (
      <View key={report.id} style={styles.medicalReportCard}>
        <View style={styles.medicalReportHeader}>
          <View style={styles.medicalReportIconContainer}>
            <Icon name="file-text" size={20} color="#1F6FE0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.medicalReportTitle}>{t('medicalReport.title')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.medicalReportDate}>{formattedDate}</Text>
              {pregnancyWeeks && (
                <View style={styles.pregnancyWeeksBadge}>
                  <Text style={styles.pregnancyWeeksText}>
                    {pregnancyWeeks.weeks} {t('home.weeks')} {pregnancyWeeks.days} {t('home.days')}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {report.provider_name && (
            <Text style={styles.medicalReportProvider}>{report.provider_name}</Text>
          )}
        </View>
        {keyMetrics.length > 0 && (
          <View style={styles.medicalReportMetrics}>
            {keyMetrics.map((metric, idx) => (
              <Text key={idx} style={styles.medicalReportMetric}>{metric}</Text>
            ))}
          </View>
        )}
        {report.proof_image_url && (
          <TouchableOpacity
            style={styles.medicalReportImageContainer}
            onPress={() => {
              // Could open image in full screen
              Alert.alert('Proof Image', 'Image available');
            }}
          >
            <Image source={{ uri: report.proof_image_url }} style={styles.medicalReportImage} />
            <View style={styles.medicalReportImageOverlay}>
              <Icon name="eye" size={16} color="#fff" />
              <Text style={styles.medicalReportImageText}>View Proof</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [transferDateStr, transferEmbryoDayStr, calculatePregnancyWeeksAtVisit, t]);

  const renderTimelineView = () => {
    return (
      <ScrollView
        style={styles.timelineContainer}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2A7BF6']}
            tintColor="#2A7BF6"
          />
        }
      >
        {renderPregnancyDashboard()}
        {isSurrogateRole && (
          <View style={styles.medicalInfoCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="activity" size={24} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Medical Information</Text>
                <Text style={styles.cardSubtitle}>Update your medical records</Text>
              </View>
            </View>

            {loadingMedicalInfo ? (
              <ActivityIndicator size="small" color="#1F6FE0" style={{ marginVertical: 16 }} />
            ) : (
              <>
                {/* #region agent log */}
                {(() => {
                  fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:2249',message:'rendering medicalInfoCard UI',data:{pregnancyTestDate,pregnancyTestDate2,pregnancyTestDate3,isSurrogateRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
                  return null;
                })()}
                {/* #endregion */}
                <View style={styles.medicalInfoSection}>
                  <Text style={styles.sectionLabel}>Medication Start Date (MM/DD/YY)</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="calendar" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      value={medicationStartDate}
                      onChangeText={setMedicationStartDate}
                      placeholder="e.g. 12/01/25"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      style={styles.fancyInput}
                    />
                  </View>
                </View>

                <View style={styles.medicalInfoSection}>
                  <Text style={styles.sectionLabel}>HCG Test Date 1 (MM/DD/YY)</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="calendar" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      value={pregnancyTestDate}
                      onChangeText={setPregnancyTestDate}
                      placeholder="e.g. 12/15/25"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      style={styles.fancyInput}
                    />
                  </View>
                </View>

                <View style={styles.medicalInfoSection}>
                  <Text style={styles.sectionLabel}>HCG Test Date 2 (MM/DD/YY)</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="calendar" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      value={pregnancyTestDate2}
                      onChangeText={(text) => {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:2286',message:'pregnancyTestDate2 onChangeText',data:{text,currentValue:pregnancyTestDate2},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                        // #endregion
                        setPregnancyTestDate2(text);
                      }}
                      placeholder="e.g. 12/20/25"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      style={styles.fancyInput}
                    />
                  </View>
                </View>

                <View style={styles.medicalInfoSection}>
                  <Text style={styles.sectionLabel}>HCG Test Date 3 (MM/DD/YY)</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="calendar" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      value={pregnancyTestDate3}
                      onChangeText={(text) => {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:2312',message:'pregnancyTestDate3 onChangeText',data:{text,currentValue:pregnancyTestDate3},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                        // #endregion
                        setPregnancyTestDate3(text);
                      }}
                      placeholder="e.g. 12/25/25"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      style={styles.fancyInput}
                    />
                  </View>
                </View>

                <View style={styles.medicalInfoSection}>
                  <Text style={styles.sectionLabel}>HCG Test Date 4 (MM/DD/YY)</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="calendar" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      value={pregnancyTestDate4}
                      onChangeText={(text) => {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.js:2330',message:'pregnancyTestDate4 onChangeText',data:{text,currentValue:pregnancyTestDate4},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                        // #endregion
                        setPregnancyTestDate4(text);
                      }}
                      placeholder="e.g. 12/30/25"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      style={styles.fancyInput}
                    />
                  </View>
                </View>

                <View style={styles.medicalInfoSection}>
                  <Text style={styles.sectionLabel}>Fetal Heartbeat Confirmation</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[styles.radioOption, fetalBeatConfirm === 'None' && styles.radioOptionSelected]}
                      onPress={() => setFetalBeatConfirm('None')}
                    >
                      <View style={[styles.radioCircle, fetalBeatConfirm === 'None' && styles.radioCircleSelected]}>
                        {fetalBeatConfirm === 'None' && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.radioLabel, fetalBeatConfirm === 'None' && styles.radioLabelSelected]}>
                        None
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioOption, fetalBeatConfirm === 'Confirmed' && styles.radioOptionSelected]}
                      onPress={() => setFetalBeatConfirm('Confirmed')}
                    >
                      <View style={[styles.radioCircle, fetalBeatConfirm === 'Confirmed' && styles.radioCircleSelected]}>
                        {fetalBeatConfirm === 'Confirmed' && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.radioLabel, fetalBeatConfirm === 'Confirmed' && styles.radioLabelSelected]}>
                        Confirmed
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioOption, fetalBeatConfirm === 'Pending' && styles.radioOptionSelected]}
                      onPress={() => setFetalBeatConfirm('Pending')}
                    >
                      <View style={[styles.radioCircle, fetalBeatConfirm === 'Pending' && styles.radioCircleSelected]}>
                        {fetalBeatConfirm === 'Pending' && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.radioLabel, fetalBeatConfirm === 'Pending' && styles.radioLabelSelected]}>
                        Pending
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.fullWidthButton, savingMedicalInfo && styles.fullWidthButtonDisabled]}
                  onPress={saveMedicalInfo}
                  disabled={savingMedicalInfo}
                  activeOpacity={0.8}
                >
                  {savingMedicalInfo ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Save Medical Information</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        {isSurrogateRole && (
          <View style={styles.stageUpdateCard}>
            <Text style={styles.stageUpdateLabel}>{t('home.updateYourStage')}</Text>
            <View style={styles.stageChipRow}>
              {STAGE_OPTIONS.map((option) => {
                const isActive = normalizeStage(serverStage) === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.stageChip,
                      isActive && styles.stageChipActive,
                      stageUpdateLoading && styles.stageChipDisabled,
                    ]}
                    onPress={() => updateSurrogateStage(option.key)}
                    disabled={stageUpdateLoading || isActive}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.stageChipLabel, isActive && styles.stageChipLabelActive]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.stageChipSubtitle, isActive && styles.stageChipSubtitleActive]}>
                      {option.description}
                    </Text>
                    {isActive && <Text style={styles.stageChipBadge}>{t('home.current')}</Text>}
                    {stageUpdateLoading && isActive && (
                      <View style={styles.stageChipSpinner}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.stageUpdateHint}>
              {t('home.changesSaved')}
            </Text>
          </View>
        )}
        {/* Match Status Hero Card */}
        {isParentRole && (
          <View style={[styles.heroCard, !matchedSurrogateId && styles.heroCardUnmatched]}>
            <View style={styles.heroContent}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>
                  {matchedSurrogateId ? 'Your Surrogate' : 'Matching Status'}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {matchedSurrogateId 
                    ? `Journey with ${matchedProfile?.name || 'your surrogate'}`
                    : 'We are finding the perfect match for you.'}
                </Text>
              </View>
              {matchedSurrogateId ? (
                <Avatar name={matchedProfile?.name || 'S'} size={60} style={styles.heroAvatar} />
              ) : (
                <View style={styles.heroIconContainer}>
                  <Icon name="search" size={30} color="#fff" />
                </View>
              )}
            </View>
            {!matchedSurrogateId && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '20%' }]} />
                </View>
                <Text style={styles.progressText}>{t('home.inProgress')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Medical Reports Section - Hide in delivery stage */}
        {medicalReports.length > 0 && getCurrentStageKey() !== 'delivery' && (
          <View style={styles.medicalReportsSection}>
            <Text style={styles.medicalReportsSectionTitle}>{t('home.medicalCheckins')}</Text>
            {medicalReports
              .filter((report) => {
                // Filter out OBGYN reports when in delivery stage
                const currentStage = getCurrentStageKey();
                if (currentStage === 'delivery' && report.stage === 'OBGYN') {
                  return false;
                }
                return true;
              })
              .map((report) => renderMedicalReport(report))}
          </View>
        )}

        {/* Add Medical Check-in Button - Hide in delivery stage */}
        {isSurrogateRole && getCurrentStageKey() !== 'delivery' && (
          <TouchableOpacity
            style={styles.addMedicalReportButton}
            onPress={() => {
              const currentStage = getCurrentStageKey();
              const medicalStage = getMedicalReportStage(currentStage);
              navigation.navigate('MedicalReportForm', { 
                stage: medicalStage,
                onSubmit: () => {
                  fetchMedicalReports();
                  fetchUserPoints(); // Refresh points after submitting report
                },
              });
            }}
            activeOpacity={0.8}
          >
            <Icon name="plus-circle" size={20} color="#1F6FE0" />
            <Text style={styles.addMedicalReportButtonText}>{t('home.addMedicalCheckin')}</Text>
          </TouchableOpacity>
        )}

        {STAGE_OPTIONS.map((stage, index) => {
          const status = getStageStatus(stage.key); // past | current | future
          const isLocked = status === 'future';
          const isCompleted = status === 'past';
          const isCurrent = status === 'current';

          return (
          <View key={stage.key} style={styles.timelineItem}>
            {/* Left Column: Date/Icon + Line */}
            <View style={styles.timelineLeftCol}>
              <View style={[
                styles.timelineIconContainer, 
                isCompleted && styles.iconCompleted,
                isCurrent && styles.iconCurrent,
                isLocked && styles.iconLocked
              ]}>
                {isCompleted ? (
                  <Icon name="check" size={20} color="#fff" />
                ) : (
                  <Icon name={stage.icon} size={20} color={isCurrent ? '#fff' : '#A0A3BD'} />
                )}
              </View>
              {index < STAGE_OPTIONS.length - 1 && (
                <View style={[
                  styles.timelineLine, 
                  (isCompleted || isCurrent) && styles.lineActive
                ]} />
              )}
            </View>

            {/* Right Column: Content */}
            <View style={styles.timelineContent}>
              <TouchableOpacity 
                style={[
                  styles.timelineCard,
                  isCurrent && styles.cardCurrent,
                  isLocked && styles.cardLocked
                ]}
                activeOpacity={isLocked ? 1 : 0.7}
                onPress={() => {
                  if (!isLocked) {
                    setStageFilter(stage.key);
                    setViewMode('feed');
                  } else {
                    Alert.alert('Locked', 'Future stages are hidden until unlocked.');
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.timelineStepText, isCurrent && styles.textCurrent]}>
                    {stage.label}
                  </Text>
                  {isCurrent && <View style={styles.statusBadge}><Text style={styles.statusText}>{t('home.inProgress')}</Text></View>}
                  {isCompleted && <View style={styles.statusBadgeCompleted}><Text style={styles.statusTextCompleted}>{t('home.completed')}</Text></View>}
                </View>
                <Text style={[styles.timelineDescText, isCurrent && styles.textCurrentSub]}>
                  {stage.description}
                </Text>
                
                {!isLocked && (
                  <View style={styles.cardFooter}>
                    <Text style={[styles.viewDetailsText, isCurrent && styles.textCurrentLink]}>
                      {t('home.viewUpdates')} &rarr;
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )})}
      </ScrollView>
    );
  };

  // Show loading state while auth is loading OR stage is not yet loaded OR checking application
  if (authLoading || !stageLoaded || checkingApplication) {
    console.log('🔒 Showing loading screen', { authLoading, stageLoaded, checkingApplication });
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2A7BF6" />
          <Text style={styles.loadingText}>
            {authLoading ? 'Loading user data...' : checkingApplication ? 'Checking application status...' : 'Loading journey stage...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if surrogate user has submitted application or has match
  const shouldShowNoMatchMessage = isSurrogateRole && !hasApplication;
  const shouldShowNoMatchForParent = isParentRole && !matchedSurrogateId;

  if (shouldShowNoMatchMessage || shouldShowNoMatchForParent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <ScrollView 
          contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <View style={{ alignItems: 'center' }}>
            <Icon name="heart" size={64} color="#FF8EA4" style={{ marginBottom: 20 }} />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' }}>
              还没有匹配
            </Text>
            <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 }}>
              {shouldShowNoMatchMessage 
                ? '您还没有提交申请，所以无法显示旅程信息。请先提交申请。'
                : '我们正在为您寻找最合适的匹配。'}
            </Text>
            {shouldShowNoMatchMessage && (
              <TouchableOpacity 
                style={{ backgroundColor: '#2A7BF6', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 }}
                onPress={() => navigation.navigate('SurrogateApplication')}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>提交申请</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  // Log when we're past loading
  console.log('✅ Past loading, rendering content', { 
    stageLoaded, 
    serverStage, 
    realStageRef: realStageRef.current,
    realMatchIdRef: realMatchIdRef.current,
    stageDataReady: stageDataReadyRef.current 
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {viewMode === 'timeline' ? (
        <>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{t('home.title')}</Text>
            <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
          </View>
          {renderTimelineView()}
          {isSurrogateRole && (
            <TouchableOpacity 
              style={styles.fabLarge} 
              onPress={() => {
                setPostStage(getCurrentStageKey()); // Default to current stage (backend-controlled)
                showImagePicker();
              }}
            >
              <Icon name="plus" size={32} color="#fff" />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <View style={styles.feedHeader}>
            <TouchableOpacity onPress={() => setViewMode('timeline')} style={styles.backButton}>
              <Icon name="chevron-left" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.feedTitle}>
              {STAGE_OPTIONS.find(s => s.key === stageFilter)?.label || t('home.allStages')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.feedContainer}>
            {/* Feed List */}
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#2A7BF6" />
                <Text style={styles.loadingText}>Loading posts...</Text>
              </View>
            ) : !feedData || feedData.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="activity" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No updates in this stage yet</Text>
                <Text style={styles.emptySubtext}>Share your first update!</Text>
              </View>
            ) : (
              <FlatList
                data={feedData}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                style={styles.feed}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#2A7BF6']}
                    tintColor="#2A7BF6"
                  />
                }
              />
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => {
              if (isParentRole) {
                Alert.alert('Restricted', 'Only surrogates can create posts.');
                return;
              }
              const filterStatus = stageFilter === 'all' ? 'current' : getStageStatus(stageFilter);
              if (filterStatus !== 'current') {
                Alert.alert('Posting restricted', 'You can only post in the current stage (e.g., Pregnancy).');
                return;
              }
              setPostStage(getCurrentStageKey());
              showImagePicker();
            }}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Post Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowModal(false); }} disabled={isPublishing}>
              <Text style={[styles.cancelButton, isPublishing && styles.disabledText]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share with Community</Text>
            <TouchableOpacity onPress={publishPost} disabled={isPublishing}>
              {isPublishing ? (
                <ActivityIndicator size="small" color="#2A7BF6" />
              ) : (
              <Text style={styles.publishButton}>Share</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Upload Progress Bar */}
          {isPublishing && uploadProgress > 0 && (
            <View style={styles.uploadProgressContainer}>
              <View style={styles.uploadProgressBar}>
                <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.uploadProgressText}>{uploadStatus}</Text>
            </View>
          )}
          
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.communityNotice}>
                <Text style={styles.communityNoticeIcon}>ℹ️</Text>
                <Text style={styles.communityNoticeText}>
                  Your post will be visible to all surrogates in the community
                </Text>
              </View>
              
              <View style={styles.userInfo}>
                <Avatar name={user?.name || 'Surrogate Member'} size={40} />
                <Text style={[styles.userName, { marginLeft: 12 }]}>{user?.name || 'Surrogate Member'}</Text>
              </View>

              <TextInput
                style={styles.textInput}
                placeholder="Share your journey, experiences, or thoughts with other surrogates..."
                placeholderTextColor="#6E7191"
                value={postText}
                onChangeText={setPostText}
                multiline
                numberOfLines={4}
                autoFocus={!selectedImage}
              />
              
              {selectedImage ? (
                <View style={styles.mediaPreviewContainer}>
                  {/* Remove button at top for easy access */}
                  <TouchableOpacity 
                    style={styles.removeMediaButtonTop}
                    onPress={() => { Keyboard.dismiss(); setSelectedImage(null); }}
                  >
                    <Text style={styles.removeMediaText}>🗑️ Remove Media</Text>
                  </TouchableOpacity>
                  
                  {selectedImage.type === 'video' || 
                   selectedImage.uri.includes('.mp4') || 
                   selectedImage.uri.includes('.mov') ||
                   selectedImage.uri.includes('.avi') ? (
                    <VideoPlayer
                      source={{ uri: selectedImage.uri }}
                      style={styles.previewVideo}
                    />
                  ) : (
                    <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                  )}
                </View>
              ) : (
                <View style={styles.mediaOptionsContainer}>
                  <Text style={styles.mediaOptionsTitle}>Add Media (Optional)</Text>
                  <View style={styles.mediaButtonsRow}>
                    <TouchableOpacity 
                      style={styles.mediaOptionButton}
                      onPress={() => { Keyboard.dismiss(); takePhoto(); }}
                    >
                      <Text style={styles.mediaEmojiIcon}>📷</Text>
                      <Text style={styles.mediaOptionText}>Camera</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.mediaOptionButton}
                      onPress={() => { Keyboard.dismiss(); recordVideo(); }}
                    >
                      <Text style={styles.mediaEmojiIcon}>🎥</Text>
                      <Text style={styles.mediaOptionText}>Video</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.mediaOptionButton}
                      onPress={() => { Keyboard.dismiss(); pickImage(); }}
                    >
                      <Text style={styles.mediaEmojiIcon}>🖼️</Text>
                      <Text style={styles.mediaOptionText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.commentModalFull}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowCommentModal(false);
              setCommentText('');
              setReplyToComment(null);
            }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {replyToComment ? 'Reply to Comment' : 'Add Comment'}
            </Text>
            <TouchableOpacity onPress={submitComment}>
              <Text style={styles.publishButton}>Post</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.commentScrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.commentInputContainer}>
              <View style={styles.userInfo}>
                <Avatar name={user?.name || 'Anonymous'} size={40} />
                <Text style={[styles.userName, { marginLeft: 12 }]}>{user?.name || 'Anonymous'}</Text>
              </View>
              
              {replyToComment && (
                <View style={styles.replyingToContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar name={replyToComment.userName} size={24} style={{ marginRight: 8 }} />
                    <Text style={styles.replyingToText}>
                      Replying to <Text style={styles.replyingToName}>{replyToComment.userName}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyToComment(null)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 16, color: '#666', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <TextInput
                style={styles.commentInput}
                placeholder={replyToComment ? "Write a reply..." : "Write a comment..."}
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                autoFocus={true}
                textAlignVertical="top"
              />
            </View>
            
            {/* Show existing comments */}
            {selectedPostForComment && getComments(selectedPostForComment).length > 0 && (
              <View style={styles.existingCommentsSection}>
                <Text style={styles.commentsListTitle}>
                  Comments ({countAllComments(getComments(selectedPostForComment))})
                </Text>
                {getComments(selectedPostForComment).map((comment) => renderCommentItem(comment, 0))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F7FA', // 更高级的冷灰背景
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, // 极淡的阴影
    shadowRadius: 10,
    elevation: 0,
    zIndex: 10,
    marginBottom: 16,
  },
  medicalInfoCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#1A1D1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  medicalInfoSection: {
    marginBottom: 20,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  radioOptionSelected: {
    borderColor: '#1F6FE0',
    backgroundColor: '#EFF6FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#1F6FE0',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1F6FE0',
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  radioLabelSelected: {
    color: '#1F6FE0',
    fontWeight: '600',
  },
  pregDashboardCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#1A1D1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F3F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D1E',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6E7191',
    fontWeight: '500',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 14,
    marginBottom: 24,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#1F6FE0',
    fontWeight: '700',
  },
  segmentDisabled: {
    opacity: 0.6,
  },
  segmentTextDisabled: {
    color: '#94A3B8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  fancyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D1E',
  },
  fullWidthButton: {
    backgroundColor: '#1F6FE0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#1F6FE0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  fullWidthButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  editTransferDateSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F9',
  },
  editSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  cancelEditButton: {
    padding: 4,
  },
  editButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: '#F0F3F9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: '#1F6FE0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  transferDateDisplay: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F9',
  },
  transferDateValue: {
    fontSize: 15,
    color: '#1A1D1E',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 8,
    lineHeight: 18,
  },
  pregDashboardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pregDashboardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  pregDashboardSub: {
    fontSize: 13,
    color: '#6E7191',
    fontWeight: '600',
  },
  pregDashboardBadge: {
    backgroundColor: '#F0F6FF',
    borderWidth: 1,
    borderColor: '#D6E6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pregDashboardBadgeText: {
    color: '#1F6FE0',
    fontWeight: '800',
    fontSize: 12,
  },
  pregProgressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
    overflow: 'hidden',
    marginBottom: 12,
  },
  pregProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1F6FE0',
  },
  pointsCard: {
    backgroundColor: '#FFFBF0',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pointsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  pointsDescription: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 16,
  },
  achievementBadge: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  achievementText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '700',
    textAlign: 'center',
  },
  pregGraduationBanner: {
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#FFE4B3',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  pregGraduationText: {
    color: '#8A5A00',
    fontWeight: '800',
    fontSize: 13,
  },
  uploadReportBtn: {
    backgroundColor: '#1F6FE0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadReportBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800',
    color: '#1A1D1E',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.5,
    textAlign: 'left', // 左对齐更现代
  },
  subtitle: {
    fontSize: 15,
    color: '#6E7191',
    fontWeight: '500',
    textAlign: 'left', // 左对齐
    marginBottom: 8,
  },
  stageUpdateCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  stageUpdateLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 10,
  },
  stageChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  stageChip: {
    flexBasis: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 100,
    marginBottom: 10,
  },
  stageChipActive: {
    backgroundColor: '#1F6FE0',
    borderColor: '#1F6FE0',
  },
  stageChipDisabled: {
    opacity: 0.7,
  },
  stageChipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  stageChipLabelActive: {
    color: '#fff',
  },
  stageChipSubtitle: {
    fontSize: 12,
    color: '#4A5164',
  },
  stageChipSubtitleActive: {
    color: '#EAF2FF',
  },
  stageChipBadge: {
    marginTop: 6,
    fontSize: 11,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  stageChipSpinner: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  stageUpdateHint: {
    fontSize: 12,
    color: '#4A5164',
  },
  timelineContainer: {
    flex: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  timelineLeftCol: {
    alignItems: 'center',
    marginRight: 16,
    width: 40,
    marginLeft: 4,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8EA4',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#FFE4E8',
    position: 'absolute',
    top: 40,
    bottom: -30,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 16,
  },
  timelineCard: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  timelineStepText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  timelineDescText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  viewStepsButton: {
    backgroundColor: '#FFE4E8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewStepsText: {
    color: '#FF8EA4',
    fontWeight: 'bold',
    fontSize: 12,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  fabLarge: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF8EA4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  feed: { 
    flex: 1,
    paddingHorizontal: 20, // 增加左右间距
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6E7191',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40
  },
  disabledText: {
    opacity: 0.5,
  },
  uploadProgressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0F7FF',
  },
  uploadProgressBar: {
    height: 6,
    backgroundColor: '#E0E7EE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#2A7BF6',
    borderRadius: 3,
  },
  uploadProgressText: {
    fontSize: 13,
    color: '#2A7BF6',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 20, // 更大的圆角
    marginBottom: 20,
    padding: 20,
    shadowColor: '#1A1D1E', // 使用深色阴影源
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, // 非常柔和
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 0,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  companyAvatar: {
    backgroundColor: '#E3F2FD',
  },
  postInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: '#A0A3BD',
    fontWeight: '500',
  },
  postText: {
    fontSize: 16,
    color: '#2E3A59',
    lineHeight: 26, // 增加行高
    marginBottom: 16,
    fontWeight: '400',
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#F5F7FA',
  },
  postVideo: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#000',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F7FA',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  likedIcon: {
    transform: [{ scale: 1.1 }],
  },
  actionText: {
    fontSize: 14,
    color: '#6E7191',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 34,
    backgroundColor: '#2A7BF6',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2A7BF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
    backgroundColor: '#fff',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6E7191',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  publishButton: {
    fontSize: 16,
    color: '#2A7BF6',
    fontWeight: '700',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  mediaPreviewContainer: {
    marginTop: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  communityNotice: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 0,
  },
  communityNoticeIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  communityNoticeText: {
    fontSize: 14,
    color: '#2A7BF6',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 16,
    color: '#1A1D1E', // 更黑的文字颜色
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  previewVideo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  mediaOptionsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
  },
  mediaOptionsTitle: {
    fontSize: 14,
    color: '#6E7191',
    fontWeight: '600',
    marginBottom: 12,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaEmojiIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  mediaOptionText: {
    fontSize: 12,
    color: '#2A7BF6',
    fontWeight: '600',
    marginTop: 4,
  },
  removeMediaButton: {
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
  },
  removeMediaButtonTop: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  removeMediaText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#28a745', // 绿色调阴影
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderLeftWidth: 0, // 移除左侧硬边
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eventInfo: {
    flex: 1,
    marginLeft: 14,
  },
  eventCategory: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 8,
    lineHeight: 28,
  },
  eventDescription: {
    fontSize: 16,
    color: '#4E5D78',
    lineHeight: 24,
    marginBottom: 16,
  },
  eventDetail: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  eventDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0A3BD',
    width: 24, // Icon width
  },
  eventDetailText: {
    fontSize: 14,
    color: '#1A1D1E',
    flex: 1,
    fontWeight: '500',
  },
  eventImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F7FA',
    marginTop: 8,
  },
  commentsPreview: {
    paddingTop: 12,
    paddingBottom: 4,
    marginTop: 8,
    backgroundColor: '#F5F7FA', // 评论预览用淡淡的背景
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  commentsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6E7191',
    marginBottom: 6,
  },
  latestComment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  commentText: {
    fontSize: 14,
    color: '#4E5D78',
    flex: 1,
  },
  commentModalFull: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  medicalReportsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  medicalReportsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 16,
  },
  medicalReportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  medicalReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicalReportIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicalReportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 2,
  },
  medicalReportDate: {
    fontSize: 13,
    color: '#6E7191',
    fontWeight: '500',
  },
  pregnancyWeeksBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  pregnancyWeeksText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00B894',
  },
  medicalReportProvider: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  medicalReportMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  medicalReportMetric: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F6FE0',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  medicalReportImageContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  medicalReportImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  medicalReportImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  medicalReportImageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  addMedicalReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#D6E6FF',
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  addMedicalReportButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F6FE0',
  },
  commentScrollView: {
    flex: 1,
  },
  commentInputContainer: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  commentInput: {
    fontSize: 16,
    color: '#1A1D1E',
    minHeight: 100,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    borderWidth: 0, // 移除边框
  },
  existingCommentsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 30, // 底部留白
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  commentsListTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 20,
  },
  commentItem: {
    marginBottom: 20,
    paddingBottom: 0, // 移除底边距
    borderBottomWidth: 0, // 移除底边框
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentInfo: {
    flex: 1,
  },
  commentUserNameBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  commentTimestamp: {
    fontSize: 11,
    color: '#A0A3BD',
    marginTop: 2,
  },
  commentTextFull: {
    fontSize: 15,
    color: '#2E3A59',
    lineHeight: 22,
    marginLeft: 42, // 对齐头像右侧
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  deleteIcon: {
    fontSize: 18,
  },
  commentDeleteButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  deleteIconSmall: {
    fontSize: 14,
  },
  deleteIconSmaller: {
    fontSize: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 42,
    marginTop: 10,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  commentLikeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  commentLikeText: {
    fontSize: 13,
    color: '#A0A3BD',
    fontWeight: '500',
  },
  commentLikedText: {
    color: '#FF6B6B',
  },
  replyButton: {
    // removed marginLeft as it's now in commentActions
  },
  replyButtonText: {
    fontSize: 13,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  repliesContainer: {
    marginLeft: 42,
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#EEF2F6',
  },
  replyItem: {
    marginBottom: 16,
  },
  replyTextFull: {
    fontSize: 14,
    color: '#2E3A59',
    lineHeight: 20,
    marginLeft: 32, // Indented for reply
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 13,
    color: '#666',
  },
  replyingToName: {
    fontWeight: '600',
    color: '#2A7BF6',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  playButtonText: {
    fontSize: 24,
    marginLeft: 4, // 微调播放图标位置
  },
  // Premium Timeline Styles
  heroCard: {
    marginHorizontal: 16,
    backgroundColor: '#2A7BF6',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#2A7BF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroCardUnmatched: {
    backgroundColor: '#6E7191', // Neutral color for unmatched
    shadowColor: '#6E7191',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 30,
  },
  heroAvatar: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },
  
  // Enhanced Timeline Items
  iconCompleted: {
    backgroundColor: '#2A7BF6',
    borderColor: '#2A7BF6',
  },
  iconCurrent: {
    backgroundColor: '#2A7BF6',
    borderColor: 'rgba(42, 123, 246, 0.3)',
    borderWidth: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: -2, // Center due to size change
  },
  iconLocked: {
    backgroundColor: '#F5F7FA',
    borderColor: '#E0E7EE',
  },
  lineActive: {
    backgroundColor: '#2A7BF6',
  },
  
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    maxWidth: '100%',
  },
  cardCurrent: {
    borderColor: '#2A7BF6',
    backgroundColor: '#F0F7FF',
    shadowColor: '#2A7BF6',
    shadowOpacity: 0.1,
  },
  cardLocked: {
    backgroundColor: '#FAFAFA',
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#2A7BF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeCompleted: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextCompleted: {
    color: '#2A7BF6',
    fontSize: 10,
    fontWeight: '700',
  },
  textCurrent: {
    color: '#2A7BF6',
  },
  textCurrentSub: {
    color: '#5C6F88',
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A7BF6',
  },
  textCurrentLink: {
    color: '#2A7BF6',
  }
}); 