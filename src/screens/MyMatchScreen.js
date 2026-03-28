import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useParentMatch } from '../context/ParentMatchContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import ParentMatchSwitcher from '../components/ParentMatchSwitcher';
import { TextInput } from 'react-native';
import { SURROGATE_APPLICATION_STEPS } from '../constants/surrogateApplicationOrder';
import {
  getPreviewStepTitle,
  getPreviewFieldLabel,
  getDeliveryLineLabels,
} from '../i18n/surrogateApplicationPreviewI18n';

function formatApplicationFieldKeyLabel(key) {
  if (!key) return '';
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const { width } = Dimensions.get('window');

export default function MyMatchScreen({ navigation }) {
  const { user } = useAuth();
  const parentMatch = useParentMatch();
  const { t, language } = useLanguage();
  const [matchData, setMatchData] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [partnerApplication, setPartnerApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('surrogate');
  const [availableSurrogates, setAvailableSurrogates] = useState([]);
  const [loadingSurrogates, setLoadingSurrogates] = useState(false);
  const [selectedSurrogate, setSelectedSurrogate] = useState(null);
  const [surrogateDetails, setSurrogateDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showSurrogateModal, setShowSurrogateModal] = useState(false);
  const [hasApplication, setHasApplication] = useState(false);
  // Pregnancy History states
  const [medicationStartDate, setMedicationStartDate] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [betaTestDate, setBetaTestDate] = useState('');
  const [fetalHeartbeatDate, setFetalHeartbeatDate] = useState('');
  const [savingPregnancyHistory, setSavingPregnancyHistory] = useState(false);
  const [checkingApplication, setCheckingApplication] = useState(true);
  const [showParentMatchSwitcher, setShowParentMatchSwitcher] = useState(false);

  useEffect(() => {
    checkUserApplication();
    loadMatchData();
  }, [user, parentMatch.activeMatch?.id, parentMatch.initialSyncDone]);

  // Listen for match creation/updates in surrogate_matches table
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    console.log('[MyMatch] Setting up listener for match updates:', { userId: user.id, role: userRole });

    const isSurrogate = userRole === 'surrogate';
    const isParent = userRole === 'parent';

    if (!isSurrogate && !isParent) {
      return;
    }

    // Create filter based on role
    let filter = '';
    if (isSurrogate) {
      filter = `surrogate_id=eq.${user.id}`;
    } else if (isParent) {
      filter = `parent_id=eq.${user.id}`;
    }

    const channel = supabase
      .channel(`match-updates-mymatch-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'surrogate_matches',
          filter: filter,
        },
        async (payload) => {
          console.log('[MyMatch] ✅ Match updated via Realtime:', payload);
          
          // Reload match data when match is created or updated (status can be 'matched' or 'active')
          if (payload.new && (payload.new.status === 'matched' || payload.new.status === 'active')) {
            console.log('[MyMatch] ✅ Matched match detected, reloading match data...');
            if (isParent) await parentMatch.refreshMatches();
            await loadMatchData();
            
            // If parent and unmatched before, also refresh surrogates list
            if (isParent && !matchData) {
              await loadAvailableSurrogates();
            }
          } else if (payload.eventType === 'DELETE' || (payload.new && payload.new.status !== 'matched' && payload.new.status !== 'active')) {
            console.log('[MyMatch] ⚠️ Match removed or deactivated, reloading...');
            if (isParent) await parentMatch.refreshMatches();
            await loadMatchData();
            
            // If parent, refresh surrogates list
            if (isParent) {
              await loadAvailableSurrogates();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[MyMatch] Match updates subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[MyMatch] ✅ Successfully subscribed to match updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[MyMatch] ⚠️ Match updates subscription failed');
        }
      });

    return () => {
      console.log('[MyMatch] Cleaning up match updates listener');
      supabase.removeChannel(channel);
    };
  }, [user?.id, userRole, parentMatch.refreshMatches]);

  const checkUserApplication = async () => {
    if (!user?.id) {
      setCheckingApplication(false);
      return;
    }

    try {
      const role = (user?.role || '').toLowerCase();
      if (role === 'surrogate') {
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
      } else {
        // For non-surrogates, always show content
        setHasApplication(true);
      }
    } catch (error) {
      console.error('Failed to check application:', error);
      setHasApplication(false);
    } finally {
      setCheckingApplication(false);
    }
  };

  const loadMatchData = async () => {
    console.log('[MyMatch] loadMatchData start', { userId: user?.id });
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1) 角色
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile role:', profileError);
      }

      const role = (profileData?.role || user?.role || 'surrogate').toLowerCase();
      setUserRole(role);
      const isSurrogate = role === 'surrogate';
      console.log('[MyMatch] role:', role);

      // 2) 匹配记录
      let match = null;
      let matchError = null;

      if (isSurrogate) {
        const { data, error } = await supabase
          .from('surrogate_matches')
          .select('*')
          .eq('surrogate_id', user.id)
          .in('status', ['matched', 'active'])
          .order('created_at', { ascending: false })
          .limit(1);
        match = data?.[0];
        matchError = error;
      } else {
        const { activeMatch: am, matches: pm } = await parentMatch.refreshMatches();
        match = am;
        matchError = null;
        if (!am && (!pm || pm.length === 0)) {
          console.log('[MyMatch] parent: no active/matched rows');
        }
      }

      if (matchError && matchError.code !== 'PGRST116') {
        console.error('Error loading match:', matchError);
      }
      console.log('[MyMatch] match:', match);

      if (match) {
        // Load pregnancy history dates
        const formatDateForDisplay = (dateValue) => {
          if (!dateValue) return '';
          const date = parseDateWithoutTimezoneShift(dateValue);
          if (!date) return '';
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          return `${month}/${day}/${year}`;
        };

        setMedicationStartDate(formatDateForDisplay(match.medication_start_date));
        setTransferDate(formatDateForDisplay(match.transfer_date));
        setDueDate(formatDateForDisplay(match.due_date));
        setBetaTestDate(formatDateForDisplay(match.pregnancy_test_date));
        setFetalHeartbeatDate(formatDateForDisplay(match.fetal_beat_date));

        // 3) 对方资料
        if (isSurrogate && match.parent_id) {
          const { data: parentProfile, error: parentError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', match.parent_id)
            .single();

          if (parentError && parentError.code !== 'PGRST116') {
            console.error('Error loading parent profile:', parentError);
          } else {
            console.log('Loaded parent profile for match:', parentProfile);
            setPartnerProfile(parentProfile);
          }
        } else if (!isSurrogate && match.surrogate_id) {
          const { data: surrogateProfile, error: surrogateError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', match.surrogate_id)
            .single();

          if (surrogateError && surrogateError.code !== 'PGRST116') {
            console.error('Error loading surrogate profile:', surrogateError);
          } else {
            console.log('Loaded surrogate profile for match:', surrogateProfile);
            setPartnerProfile(surrogateProfile);
          }

          // Load surrogate's complete application data
          const { data: applicationData, error: applicationError } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', match.surrogate_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (applicationError && applicationError.code !== 'PGRST116') {
            console.error('Error loading surrogate application:', applicationError);
          } else if (applicationData) {
            console.log('Loaded surrogate application for match:', applicationData);
            // Parse form_data JSON
            let parsedFormData = {};
            try {
              if (applicationData.form_data) {
                parsedFormData = JSON.parse(applicationData.form_data);
              }
            } catch (e) {
              console.error('Error parsing form_data:', e);
            }
            setPartnerApplication({
              ...applicationData,
              parsedFormData,
            });
          }
        }

        setMatchData(match);

        // 4) 文档
        // For match-uploaded documents:
        // - Surrogate sees documents with user_id = surrogate_id (surrogate_contract, etc.)
        // - Parent sees documents with user_id = parent_id (parent_contract, etc.)
        // Also check for documents uploaded to both users (same file_url, different user_id)
        const currentUserId = user.id;
        const partnerUserId = isSurrogate ? match.parent_id : match.surrogate_id;
        const GLOBAL_CONTRACT_USER_ID = '00000000-0000-0000-0000-000000000000';
        
        // Build query to get documents for current user OR partner user (for match-uploaded files)
        const userIdOrClause = [
          currentUserId ? `user_id.eq.${currentUserId}` : null,
          partnerUserId ? `user_id.eq.${partnerUserId}` : null,
          `user_id.eq.${GLOBAL_CONTRACT_USER_ID}`,
          'user_id.is.null',
        ]
          .filter(Boolean)
          .join(',');

        // Build document types list based on role
        // Surrogates see: agency_retainer, hipaa_release (but not in My Match, only in Profile)
        const documentTypes = [
          'surrogacy_contract',
          'attorney_retainer',
          'agency_contract',
          'insurance_policy',
          'health_insurance_bill',
          'parental_rights',
          'medical_records',
          'parent_contract',
          'surrogate_contract',
          // 'online_claims', // Moved to User Center (ProfileScreen)
          // trust_account: surrogate My Match only (not shown to parents)
          ...(isSurrogate ? ['trust_account'] : []),
        ];

        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .in('document_type', documentTypes)
          .or(userIdOrClause)
          .order('created_at', { ascending: false });

        if (docsError) {
          console.error('Error loading documents:', docsError);
        } else {
          setDocuments(docs || []);
          console.log('[MyMatch] documents count:', docs?.length || 0);
        }
      } else {
        console.log('[MyMatch] no active match, unmatched state');
        setMatchData(null);
        setPartnerProfile(null);
        setPartnerApplication(null);
        setDocuments([]);
        
        // If parent user and unmatched, load available surrogates
        if (!isSurrogate) {
          loadAvailableSurrogates();
        }
      }
    } catch (error) {
      console.error('Error in loadMatchData:', error);
      Alert.alert('Error', 'Failed to load match information');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSurrogates = async () => {
    try {
      setLoadingSurrogates(true);

      // Get all available surrogates first
      const { data: allSurrogates, error: surrogatesError } = await supabase
        .from('profiles')
        .select('id, name, phone, location, available')
        .eq('role', 'surrogate')
        .eq('available', true)
        .order('created_at', { ascending: false });

      if (surrogatesError) {
        console.error('[MyMatch] Error loading available surrogates:', surrogatesError);
        setAvailableSurrogates([]);
        return;
      }

      console.log('[MyMatch] Total available surrogates before filtering:', allSurrogates?.length || 0);

      if (!allSurrogates || allSurrogates.length === 0) {
        setAvailableSurrogates([]);
        return;
      }

      // Active match statuses (exclude cancelled/completed)
      const activeStatuses = ['matched', 'pending', 'pregnant', 'active'];

      // Try to query all active matches at once
      // If RLS blocks this, we'll get an error and handle it
      const { data: allActiveMatches, error: allMatchesError } = await supabase
        .from('surrogate_matches')
        .select('surrogate_id, status, parent_id, first_parent_id')
        .in('status', activeStatuses);

      let matchedSurrogateIds = new Set();

      if (allMatchesError) {
        console.log('[MyMatch] Cannot query all matches (RLS restriction):', allMatchesError.message);
        console.log('[MyMatch] Checking each surrogate individually...');

        // Per-surrogate check: only exclude when we actually see a match.
        // When we get an error (e.g. RLS), do NOT exclude - show the surrogate so the list stays complete.
        for (const surrogate of allSurrogates) {
          const { data: matches, error: matchError } = await supabase
            .from('surrogate_matches')
            .select('id, status, surrogate_id')
            .eq('surrogate_id', surrogate.id)
            .in('status', activeStatuses)
            .limit(1);

          if (matchError) {
            // RLS or other error: we can't verify, so include surrogate to avoid incomplete list
            console.log(`[MyMatch] Cannot verify match for ${surrogate.id} (${surrogate.name}), including in list`);
          } else if (matches && matches.length > 0) {
            matchedSurrogateIds.add(surrogate.id);
            console.log(`[MyMatch] Excluding matched surrogate: ${surrogate.id} (${surrogate.name})`);
          }
        }
      } else {
        // Successfully got all matches
        matchedSurrogateIds = new Set(
          (allActiveMatches || [])
            .map(m => m.surrogate_id)
            .filter(id => id != null && id !== '')
        );
        console.log('[MyMatch] Found', matchedSurrogateIds.size, 'matched surrogates from bulk query');
        console.log('[MyMatch] Matched surrogate IDs:', Array.from(matchedSurrogateIds));
      }

      // Filter out matched surrogates
      const availableSurrogates = allSurrogates.filter(
        surrogate => !matchedSurrogateIds.has(surrogate.id)
      );

      console.log('[MyMatch] Final available surrogates after filtering:', availableSurrogates.length);
      console.log('[MyMatch] Excluded', matchedSurrogateIds.size, 'matched surrogates');
      console.log('[MyMatch] Matched surrogate IDs:', Array.from(matchedSurrogateIds));
      
      setAvailableSurrogates(availableSurrogates);
    } catch (error) {
      console.error('[MyMatch] Error in loadAvailableSurrogates:', error);
      setAvailableSurrogates([]);
    } finally {
      setLoadingSurrogates(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatchData();
    // If parent and unmatched, also refresh surrogates list
    if (userRole === 'parent' && !matchData) {
      await loadAvailableSurrogates();
    }
    setRefreshing(false);
  };

  const handleDocumentPress = async (document) => {
    const url = document.file_url || document.url;
    if (url) {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert(t('common.error'), t('myMatch.cannotOpenDocument'));
        }
      } catch (error) {
        console.error('Error opening document:', error);
        Alert.alert(t('common.error'), t('myMatch.failedToOpen'));
      }
    } else {
      Alert.alert(t('common.error'), t('myMatch.documentNotAvailable'));
    }
  };

  const handleViewSurrogateDetails = async (surrogate) => {
    try {
      setLoadingDetails(true);
      setSelectedSurrogate(surrogate);
      setShowSurrogateModal(true);

      console.log('[MyMatch] Loading surrogate details for:', surrogate.id, surrogate.name);

      // Load full profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', surrogate.id)
        .single();

      if (profileError) {
        console.error('[MyMatch] Error loading surrogate profile:', profileError);
        // Even if profile load fails, we still have surrogate data from the list
      } else {
        console.log('[MyMatch] Profile loaded successfully:', {
          name: profile?.name,
          phone: profile?.phone,
          email: profile?.email,
          location: profile?.location,
        });
      }

      // Load application data - try to get any application, not just approved
      let applicationData = null;
      let parsedFormData = {};
      
      // First try to get approved application
      let { data: application, error: applicationError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', surrogate.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no approved application, try to get any application
      if (!application) {
        const { data: anyApplication, error: anyAppError } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', surrogate.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (anyApplication) {
          application = anyApplication;
          console.log('[MyMatch] Found non-approved application:', application.status);
        } else if (anyAppError && anyAppError.code !== 'PGRST116') {
          console.error('[MyMatch] Error loading any application:', anyAppError);
        }
      }

      if (applicationError && applicationError.code !== 'PGRST116') {
        console.error('[MyMatch] Error loading approved application:', applicationError);
      }

      if (application) {
        applicationData = application;
        try {
          if (application.form_data) {
            parsedFormData = JSON.parse(application.form_data);
            console.log('[MyMatch] Parsed form data:', Object.keys(parsedFormData));
          }
        } catch (e) {
          console.error('[MyMatch] Error parsing form_data:', e);
        }
      } else {
        console.log('[MyMatch] No application found for surrogate:', surrogate.id);
      }

      // Always set details, even if profile load failed
      // Use profile data if available, otherwise fall back to surrogate data from list
      const details = {
        profile: profile || surrogate,
        application: applicationData,
        parsedFormData: parsedFormData || {},
      };

      console.log('[MyMatch] Setting surrogate details:', {
        hasProfile: !!details.profile,
        profileName: details.profile?.name,
        profilePhone: details.profile?.phone,
        profileLocation: details.profile?.location,
        hasApplication: !!details.application,
        formDataKeys: Object.keys(details.parsedFormData),
        surrogateFallback: !profile ? 'Using surrogate data from list' : 'Using profile data',
      });

      setSurrogateDetails(details);
    } catch (error) {
      console.error('Error loading surrogate details:', error);
      Alert.alert(t('common.error'), 'Failed to load surrogate details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const parseDateWithoutTimezoneShift = (value) => {
    if (!value) return null;
    const s = String(value).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatMatchDate = (dateString) => {
    const date = parseDateWithoutTimezoneShift(dateString);
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const maskName = (name, shouldMask = true) => {
    if (!name) return 'N/A';
    const rawName = String(name).trim();
    if (!rawName) return 'N/A';
    if (!shouldMask) return rawName;

    const parts = rawName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return parts
        .map((part) => {
          if (part.length <= 1) return '*';
          return `${part[0]}${'*'.repeat(Math.min(3, part.length - 1))}`;
        })
        .join(' ');
    }

    if (rawName.length <= 1) return '*';
    return `${rawName[0]}${'*'.repeat(Math.min(3, rawName.length - 1))}`;
  };

  // Helper functions for date parsing
  const parseMMDDYYToISO = (dateString) => {
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    return date;
  };

  const formatDateToISO = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Save pregnancy history
  const savePregnancyHistory = async () => {
    if (!user?.id || userRole !== 'surrogate' || !matchData?.id) {
      Alert.alert(t('common.error'), t('myMatch.pregnancyHistoryErrorNotSurrogate'));
      return;
    }

    setSavingPregnancyHistory(true);
    try {
      const updateData = {};

      if (medicationStartDate.trim()) {
        const parsed = parseMMDDYYToISO(medicationStartDate.trim());
        if (!parsed) {
          Alert.alert(
            t('myMatch.pregnancyHistoryInvalidTitle'),
            t('myMatch.pregnancyHistoryInvalidFormat', {
              field: t('myMatch.pregnancyHistoryMedicationStart'),
            })
          );
          setSavingPregnancyHistory(false);
          return;
        }
        updateData.medication_start_date = formatDateToISO(parsed);
      } else {
        updateData.medication_start_date = null;
      }

      if (transferDate.trim()) {
        const parsed = parseMMDDYYToISO(transferDate.trim());
        if (!parsed) {
          Alert.alert(
            t('myMatch.pregnancyHistoryInvalidTitle'),
            t('myMatch.pregnancyHistoryInvalidFormat', { field: t('myMatch.pregnancyHistoryTransfer') })
          );
          setSavingPregnancyHistory(false);
          return;
        }
        updateData.transfer_date = formatDateToISO(parsed);
      } else {
        updateData.transfer_date = null;
      }

      if (dueDate.trim()) {
        const parsed = parseMMDDYYToISO(dueDate.trim());
        if (!parsed) {
          Alert.alert(
            t('myMatch.pregnancyHistoryInvalidTitle'),
            t('myMatch.pregnancyHistoryInvalidFormat', { field: t('myMatch.pregnancyHistoryDue') })
          );
          setSavingPregnancyHistory(false);
          return;
        }
        updateData.due_date = formatDateToISO(parsed);
      } else {
        updateData.due_date = null;
      }

      if (betaTestDate.trim()) {
        const parsed = parseMMDDYYToISO(betaTestDate.trim());
        if (!parsed) {
          Alert.alert(
            t('myMatch.pregnancyHistoryInvalidTitle'),
            t('myMatch.pregnancyHistoryInvalidFormat', { field: t('myMatch.pregnancyHistoryBetaTest') })
          );
          setSavingPregnancyHistory(false);
          return;
        }
        updateData.pregnancy_test_date = formatDateToISO(parsed);
      } else {
        updateData.pregnancy_test_date = null;
      }

      if (fetalHeartbeatDate.trim()) {
        const parsed = parseMMDDYYToISO(fetalHeartbeatDate.trim());
        if (!parsed) {
          Alert.alert(
            t('myMatch.pregnancyHistoryInvalidTitle'),
            t('myMatch.pregnancyHistoryInvalidFormat', {
              field: t('myMatch.pregnancyHistoryFetalHeartbeat'),
            })
          );
          setSavingPregnancyHistory(false);
          return;
        }
        updateData.fetal_beat_date = formatDateToISO(parsed);
      } else {
        updateData.fetal_beat_date = null;
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('surrogate_matches')
        .update(updateData)
        .eq('id', matchData.id)
        .eq('surrogate_id', user.id);

      if (error) {
        console.error('Error updating pregnancy history:', error);
        Alert.alert(t('common.error'), t('myMatch.pregnancyHistorySaveError'));
        return;
      }

      Alert.alert(t('common.success'), t('myMatch.pregnancyHistorySaveSuccess'));
      loadMatchData();
    } catch (error) {
      console.error('Error in savePregnancyHistory:', error);
      Alert.alert(t('common.error'), t('myMatch.pregnancyHistorySaveError'));
    } finally {
      setSavingPregnancyHistory(false);
    }
  };

  const openMatchedProfile = async () => {
    const targetId = userRole === 'surrogate' ? matchData?.parent_id : matchData?.surrogate_id;
    if (!targetId) {
      Alert.alert(t('common.error'), t('profileDetail.profileNotAvailable'));
      return;
    }

    let targetProfile = partnerProfile;
    let targetApplication = partnerApplication;

    try {
      if (!targetProfile || targetProfile.id !== targetId) {
        const { data: fallbackProfile, error: fallbackProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        if (fallbackProfileError && fallbackProfileError.code !== 'PGRST116') {
          console.error('[MyMatch] Failed to fetch fallback profile:', fallbackProfileError);
        } else if (fallbackProfile) {
          targetProfile = fallbackProfile;
          setPartnerProfile(fallbackProfile);
        }
      }

      if (userRole === 'parent' && !targetApplication) {
        const { data: fallbackApplication, error: fallbackApplicationError } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', targetId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackApplicationError && fallbackApplicationError.code !== 'PGRST116') {
          console.error('[MyMatch] Failed to fetch fallback application:', fallbackApplicationError);
        } else if (fallbackApplication) {
          let parsedFormData = {};
          try {
            if (fallbackApplication.form_data) {
              parsedFormData =
                typeof fallbackApplication.form_data === 'string'
                  ? JSON.parse(fallbackApplication.form_data)
                  : fallbackApplication.form_data;
            }
          } catch (parseError) {
            console.error('[MyMatch] Failed to parse fallback application form_data:', parseError);
          }

          targetApplication = {
            ...fallbackApplication,
            parsedFormData,
          };
          setPartnerApplication(targetApplication);
        }
      }
    } catch (error) {
      console.error('[MyMatch] Failed to open matched profile:', error);
    }

    if (!targetProfile) {
      Alert.alert(t('common.error'), t('profileDetail.profileNotAvailable'));
      return;
    }

    navigation.navigate('IntendedParentsProfile', {
      profile: targetProfile,
      application: targetApplication || null,
    });
  };

  // Render Unmatched State
  const renderUnmatchedState = () => {
    const isParent = userRole === 'parent';
    
    return (
    <ScrollView
      contentContainerStyle={styles.unmatchedContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.unmatchedContent}>
        <View style={styles.unmatchedIconContainer}>
          <Icon name="search" size={64} color="#FF8EA4" />
        </View>
        <Text style={styles.unmatchedTitle}>{t('myMatch.matchingInProgress')}</Text>
        <Text style={styles.unmatchedDescription}>
          {t('myMatch.matchingDescription')}
        </Text>

          {/* Show available surrogates for parent users */}
          {isParent && (
            <View style={styles.availableSurrogatesSection}>
              <Text style={styles.availableSurrogatesTitle}>{t('myMatch.availableSurrogatesTitle')}</Text>
              {loadingSurrogates ? (
                <ActivityIndicator size="small" color="#FF8EA4" style={styles.loadingIndicator} />
              ) : availableSurrogates.length > 0 ? (
                <View style={styles.surrogatesList}>
                  {availableSurrogates.map((surrogate) => (
                    <TouchableOpacity
                      key={surrogate.id}
                      style={styles.surrogateCard}
                      onPress={() => handleViewSurrogateDetails(surrogate)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.surrogateCardHeader}>
                        <Avatar name={surrogate.name || 'S'} size={40} />
                        <View style={styles.surrogateCardInfo}>
                          <Text style={styles.surrogateName}>{maskName(surrogate.name, true)}</Text>
                          {surrogate.phone && (
                            <Text style={styles.surrogatePhone}>{surrogate.phone}</Text>
                          )}
                          {surrogate.location && (
                            <Text style={styles.surrogateLocation}>
                              <Icon name="map-pin" size={12} color="#6E7191" /> {surrogate.location}
                            </Text>
                          )}
                        </View>
                        <View style={styles.surrogateCardActions}>
                          <View style={styles.surrogateAvailableBadge}>
                            <Text style={styles.surrogateAvailableBadgeText}>{t('myMatch.available')}</Text>
                          </View>
                          <Icon name="chevron-right" size={20} color="#6E7191" style={styles.viewDetailsIcon} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noSurrogatesText}>{t('myMatch.noAvailableSurrogates')}</Text>
              )}
            </View>
          )}

        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => Linking.openURL('mailto:support@agency.com')}
        >
          <Text style={styles.contactButtonText}>{t('myMatch.contactAgency')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
  };

  // Render Matched State with Premium Design
  const renderMatchedState = () => {
    const isSurrogate = userRole === 'surrogate';
    const partnerName = partnerProfile?.name || t('myMatch.partner');
    const userName = user?.name || t('myMatch.you');
    const matchDate = formatMatchDate(matchData?.created_at);
    
    // Document configuration based on role
    const documentConfig = [
      {
        key: 'intended_parents_profile',
        label: isSurrogate ? t('myMatch.intendedParentsProfile') : t('profileDetail.surrogateProfile'),
        icon: 'user',
        iconColor: '#FF8EA4',
        documentType: isSurrogate ? 'parent_contract' : null,
        alwaysAvailable: !!partnerProfile, // Available if we have partner profile
      },
      {
        key: 'attorney_retainer',
        label: t('myMatch.attorneyRetainer'),
        icon: 'briefcase',
        iconColor: '#6C5CE7',
        documentType: 'attorney_retainer',
      },
      {
        key: 'surrogacy_contract',
        label: t('myMatch.surrogacyContract'),
        icon: 'file-text',
        iconColor: '#00B894',
        documentType: isSurrogate ? 'surrogate_contract' : 'parent_contract',
      },
      {
        key: 'life_insurance',
        label: t('myMatch.lifeInsurance'),
        icon: 'shield',
        iconColor: '#FDCB6E',
        documentType: 'insurance_policy',
      },
      {
        key: 'health_insurance',
        label: t('myMatch.healthInsurance'),
        icon: 'heart',
        iconColor: '#E17055',
        documentType: 'health_insurance_bill',
      },
      {
        key: 'pbo',
        label: t('myMatch.pbo'),
        icon: 'file',
        iconColor: '#A29BFE',
        documentType: 'parental_rights',
      },
      // Online Claims moved to User Center (ProfileScreen)
      ...(isSurrogate
        ? [
            {
              key: 'trust_account',
              label: t('myMatch.trustAccount'),
              icon: 'dollar-sign',
              iconColor: '#2ECC71',
              documentType: 'trust_account',
            },
          ]
        : []),
    ];
    
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Header with Gradient Effect */}
        <View style={styles.gradientHeader}>
          <View style={styles.headerDecoration1} />
          <View style={styles.headerDecoration2} />
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              {/* Match Avatars */}
              <View style={styles.matchAvatarsContainer}>
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatarShadow}>
                    <Avatar name={userName} size={80} />
              </View>
                  <Text style={styles.avatarLabel}>{userName}</Text>
            </View>
            
                <View style={styles.matchIconContainer}>
                  <View style={styles.matchIconCircle}>
                    <Icon name="check" size={32} color="#fff" />
              </View>
                  {matchDate && (
                    <Text style={styles.matchDate}>{matchDate}</Text>
                  )}
                </View>
                
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatarShadow}>
                    <Avatar name={partnerName} size={80} />
                  </View>
                  <Text style={styles.avatarLabel}>{partnerName}</Text>
                </View>
              </View>
            </View>
            {userRole === 'parent' && parentMatch.matches.length > 1 && (
              <TouchableOpacity
                style={styles.parentSwitchHeaderBtn}
                onPress={() => setShowParentMatchSwitcher(true)}
                activeOpacity={0.85}
              >
                <Icon name="shuffle" size={18} color="#fff" />
                <Text style={styles.parentSwitchHeaderBtnText}>
                  Switch surrogate ({parentMatch.matches.length})
                </Text>
              </TouchableOpacity>
            )}
          </SafeAreaView>
        </View>

        {/* Documents Section */}
        <View style={styles.documentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('myMatch.documentsRecords')}</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {(() => {
                  // Count actual available documents (not total document records)
                  // Match-uploaded files create multiple records, but should count as one document
                  let availableCount = 0;
                  documentConfig.forEach((doc) => {
                    if (doc.alwaysAvailable) {
                      availableCount++;
                    } else if (doc.documentType) {
                      let docData = null;
                      if (doc.documentType === 'attorney_retainer') {
                        docData = documents.find(d => 
                          d.document_type === 'attorney_retainer' && 
                          d.user_id === user.id
                        );
                      } else {
                        docData = documents.find(d => {
                          if (d.document_type !== doc.documentType) return false;
                          if (d.user_id === user.id) return true;
                          if (doc.documentType === 'surrogate_contract' || doc.documentType === 'parent_contract') {
                            const correspondingDoc = documents.find(doc => 
                              doc.file_url === d.file_url && 
                              doc.user_id === user.id &&
                              (doc.document_type === 'surrogate_contract' || doc.document_type === 'parent_contract')
                            );
                            return !!correspondingDoc;
                          }
                          return false;
                        });
                      }
                      if (docData) availableCount++;
                    }
                  });
                  return availableCount;
                })()} {t('myMatch.available')}
              </Text>
            </View>
          </View>

          <View style={styles.documentsList}>
            {documentConfig.map((doc) => {
              let docData = null;
              if (doc.documentType) {
                if (doc.documentType === 'attorney_retainer') {
                  // For Attorney Retainer Agreement, only look for attorney_retainer type
                  // Check if document belongs to current user
                  docData = documents.find(d => 
                    d.document_type === 'attorney_retainer' && 
                    d.user_id === user.id
                  );
              } else {
                  // For other documents, find by document_type and ensure it's for the current user
                  // Match-uploaded files: surrogate_contract has user_id = surrogate_id, parent_contract has user_id = parent_id
                  docData = documents.find(d => {
                    if (d.document_type !== doc.documentType) return false;
                    // Check if this document belongs to current user
                    if (d.user_id === user.id) return true;
                    // For match-uploaded files, also check if there's a corresponding document with same file_url
                    // This handles cases where the file was uploaded for the partner but should be visible to both
                    if (doc.documentType === 'surrogate_contract' || doc.documentType === 'parent_contract') {
                      // Check if there's a document with same file_url for current user
                      const correspondingDoc = documents.find(doc => 
                        doc.file_url === d.file_url && 
                        doc.user_id === user.id &&
                        (doc.document_type === 'surrogate_contract' || doc.document_type === 'parent_contract')
                      );
                      return !!correspondingDoc;
                    }
                    return false;
                  });
                }
              }
              
              const isAvailable = doc.alwaysAvailable || !!docData;
              const isLocked = !isAvailable;
              
              // Special handling for Intended Parents Profile
              const handlePress = () => {
                if (doc.key === 'intended_parents_profile') {
                  openMatchedProfile();
                } else if (isAvailable) {
                  handleDocumentPress(docData || {});
                }
              };
              
              return (
                <TouchableOpacity 
                  key={doc.key}
                  style={[
                    styles.documentCard,
                    isLocked && styles.documentCardLocked,
                  ]}
                  onPress={handlePress}
                  disabled={isLocked && doc.key !== 'intended_parents_profile'}
                  activeOpacity={isLocked && doc.key !== 'intended_parents_profile' ? 1 : 0.7}
                >
                  <View style={[
                    styles.documentIconContainer,
                    { backgroundColor: isLocked ? '#F5F7FA' : `${doc.iconColor}15` },
                  ]}>
                    <Icon 
                      name={isLocked ? 'lock' : doc.icon} 
                      size={24} 
                      color={isLocked ? '#CBD5E0' : doc.iconColor} 
                    />
                  </View>
                  
                  <View style={styles.documentContent}>
                    <View style={styles.documentHeader}>
                      <Text style={[
                        styles.documentTitle,
                        isLocked && styles.documentTitleLocked,
                      ]}>
                        {doc.label}
                      </Text>
                      {!isLocked && (
                        <View style={styles.availableBadge}>
                          <View style={styles.availableDot} />
                          <Text style={styles.availableText}>{t('myMatch.available')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.documentStatus}>
                      {isLocked ? t('myMatch.pendingUpload') : t('myMatch.tapToView')}
                    </Text>
                  </View>

                  {!isLocked && (
                    <View style={styles.documentArrow}>
                      <Icon name="chevron-right" size={20} color="#CBD5E0" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pregnancy History Section */}
        <View style={styles.pregnancyHistorySection}>
          <Text style={styles.sectionTitle}>{t('myMatch.pregnancyHistoryTitle')}</Text>
          <View style={styles.pregnancyHistoryCard}>
            <View style={styles.pregnancyHistoryItem}>
              <Text style={styles.pregnancyHistoryLabel}>
                {t('myMatch.pregnancyHistoryMedicationStart')}
              </Text>
              <View style={styles.pregnancyHistoryInputContainer}>
                <Icon name="calendar" size={18} color="#94A3B8" />
                <TextInput
                  value={medicationStartDate}
                  onChangeText={setMedicationStartDate}
                  placeholder={
                    isSurrogate
                      ? t('myMatch.pregnancyHistoryDatePlaceholder')
                      : t('myMatch.pregnancyHistoryReadonlyPlaceholder')
                  }
                  placeholderTextColor="#94A3B8"
                  editable={isSurrogate}
                  style={[styles.pregnancyHistoryInput, !isSurrogate && { color: '#64748B' }]}
                />
              </View>
            </View>

            <View style={styles.pregnancyHistoryItem}>
              <Text style={styles.pregnancyHistoryLabel}>
                {t('myMatch.pregnancyHistoryTransfer')}
              </Text>
              <View style={styles.pregnancyHistoryInputContainer}>
                <Icon name="calendar" size={18} color="#94A3B8" />
                <TextInput
                  value={transferDate}
                  onChangeText={setTransferDate}
                  placeholder={
                    isSurrogate
                      ? t('myMatch.pregnancyHistoryDatePlaceholder')
                      : t('myMatch.pregnancyHistoryReadonlyPlaceholder')
                  }
                  placeholderTextColor="#94A3B8"
                  editable={isSurrogate}
                  style={[styles.pregnancyHistoryInput, !isSurrogate && { color: '#64748B' }]}
                />
              </View>
            </View>

            <View style={styles.pregnancyHistoryItem}>
              <Text style={styles.pregnancyHistoryLabel}>
                {t('myMatch.pregnancyHistoryBetaTest')}
              </Text>
              <View style={styles.pregnancyHistoryInputContainer}>
                <Icon name="heart" size={18} color="#94A3B8" />
                <TextInput
                  value={betaTestDate}
                  onChangeText={setBetaTestDate}
                  placeholder={
                    isSurrogate
                      ? t('myMatch.pregnancyHistoryDatePlaceholder')
                      : t('myMatch.pregnancyHistoryReadonlyPlaceholder')
                  }
                  placeholderTextColor="#94A3B8"
                  editable={isSurrogate}
                  style={[styles.pregnancyHistoryInput, !isSurrogate && { color: '#64748B' }]}
                />
              </View>
            </View>

            <View style={styles.pregnancyHistoryItem}>
              <Text style={styles.pregnancyHistoryLabel}>
                {t('myMatch.pregnancyHistoryFetalHeartbeat')}
              </Text>
              <View style={styles.pregnancyHistoryInputContainer}>
                <Icon name="activity" size={18} color="#94A3B8" />
                <TextInput
                  value={fetalHeartbeatDate}
                  onChangeText={setFetalHeartbeatDate}
                  placeholder={
                    isSurrogate
                      ? t('myMatch.pregnancyHistoryDatePlaceholder')
                      : t('myMatch.pregnancyHistoryReadonlyPlaceholder')
                  }
                  placeholderTextColor="#94A3B8"
                  editable={isSurrogate}
                  style={[styles.pregnancyHistoryInput, !isSurrogate && { color: '#64748B' }]}
                />
              </View>
            </View>

            <View style={styles.pregnancyHistoryItem}>
              <Text style={styles.pregnancyHistoryLabel}>{t('myMatch.pregnancyHistoryDue')}</Text>
              <View style={styles.pregnancyHistoryInputContainer}>
                <Icon name="calendar" size={18} color="#94A3B8" />
                <TextInput
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder={
                    isSurrogate
                      ? t('myMatch.pregnancyHistoryDatePlaceholder')
                      : t('myMatch.pregnancyHistoryReadonlyPlaceholder')
                  }
                  placeholderTextColor="#94A3B8"
                  editable={isSurrogate}
                  style={[styles.pregnancyHistoryInput, !isSurrogate && { color: '#64748B' }]}
                />
              </View>
            </View>

            {isSurrogate && (
              <TouchableOpacity
                style={[styles.savePregnancyHistoryButton, savingPregnancyHistory && styles.savePregnancyHistoryButtonDisabled]}
                onPress={savePregnancyHistory}
                disabled={savingPregnancyHistory}
                activeOpacity={0.8}
              >
                {savingPregnancyHistory ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.savePregnancyHistoryButtonText}>
                    {t('myMatch.savePregnancyHistory')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Medical & Appointments Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>{t('myMatch.medicalAppointmentsTitle')}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('SurrogateMedicalInfo', isSurrogate ? {} : { surrogateId: matchData?.surrogate_id, readOnly: true })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EDE7F6' }]}>
                <Icon name="activity" size={24} color="#2A7BF6" />
              </View>
              <Text style={styles.quickActionLabel}>{t('profile.medicalInfo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('OBAppointments')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="calendar" size={24} color="#10B981" />
              </View>
              <Text style={styles.quickActionLabel}>{t('myMatch.obAppointments')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('IVFAppointments')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="calendar" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionLabel}>{t('myMatch.ivfAppointments')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>{t('myMatch.quickActions')}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => partnerProfile?.phone && Linking.openURL(`tel:${partnerProfile.phone}`)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="phone" size={24} color="#00B894" />
              </View>
              <Text style={styles.quickActionLabel}>{t('myMatch.call')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => partnerProfile?.email && Linking.openURL(`mailto:${partnerProfile.email}`)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Icon name="mail" size={24} color="#FF8EA4" />
              </View>
              <Text style={styles.quickActionLabel}>{t('myMatch.email')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('My Journey')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="heart" size={24} color="#2A7BF6" />
              </View>
              <Text style={styles.quickActionLabel}>{t('myMatch.journey')}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    );
  };

  if (checkingApplication || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8EA4" />
        <Text style={styles.loadingText}>
          {checkingApplication ? 'Checking application status...' : t('myMatch.loadingMatchInfo')}
        </Text>
      </View>
    );
  }

  // Check if surrogate user has submitted application
  const isSurrogate = userRole === 'surrogate';
  if (isSurrogate && !hasApplication) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.unmatchedContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.unmatchedContent}>
            <View style={styles.unmatchedIconContainer}>
              <Icon name="file-text" size={64} color="#FF8EA4" />
            </View>
            <Text style={styles.unmatchedTitle}>No Match Yet</Text>
            <Text style={styles.unmatchedDescription}>
              You haven't submitted an application yet, so we cannot display match information. Please submit your application first.
            </Text>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => navigation.navigate('SurrogateApplication')}
            >
              <Text style={styles.contactButtonText}>Submit Application</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const renderSurrogateDetailsModal = () => {
    if (!selectedSurrogate) return null;

    // Show loading state if details are still loading
    if (!surrogateDetails) {
      return (
        <Modal
          visible={showSurrogateModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowSurrogateModal(false);
            setSelectedSurrogate(null);
            setSurrogateDetails(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('profileDetail.surrogateProfile')}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowSurrogateModal(false);
                    setSelectedSurrogate(null);
                    setSurrogateDetails(null);
                  }}
                  style={styles.modalCloseButton}
                >
                  <Icon name="x" size={24} color="#1A1D1E" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#FF8EA4" />
                <Text style={styles.modalLoadingText}>{t('common.loading')}</Text>
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    const { profile, parsedFormData } = surrogateDetails;
    // Use profile if available, otherwise use selectedSurrogate (from the list)
    const surrogateProfile = profile || selectedSurrogate;
    
    // Check if user is matched - if not matched, mask sensitive information
    const isMatched = !!matchData;
    const naLabel = t('myMatch.notApplicable');

    // Resolve display value for a field (form data + profile fallback for contact info)
    const getFieldValue = (key) => {
      const formVal = parsedFormData?.[key];
      if (key === 'fullName' && (formVal == null || formVal === '') && surrogateProfile?.name) return surrogateProfile.name;
      if (key === 'phoneNumber' && (formVal == null || formVal === '') && surrogateProfile?.phone) return surrogateProfile.phone;
      if (key === 'email' && (formVal == null || formVal === '') && surrogateProfile?.email) return surrogateProfile.email;
      if (key === 'address' && (formVal == null || formVal === '') && surrogateProfile?.address) return surrogateProfile.address;
      if (key === 'location') return surrogateProfile?.location || selectedSurrogate?.location || formVal;
      return formVal;
    };

    const shouldExcludeKey = (key) => {
      const lowerKey = String(key || '').toLowerCase();
      if (['photos', 'photourl', 'photo', 'photo_url'].includes(lowerKey)) return true;
      if (!isMatched && lowerKey.includes('emergency')) return true;
      return false;
    };

    const hasValue = (key) => {
      if (shouldExcludeKey(key)) return false;
      const value = getFieldValue(key);
      if (value === null || value === undefined) return false;
      if (typeof value === 'boolean') return true;
      if (typeof value === 'string' && value.trim() === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    };

    // Helper function to mask sensitive information
    const maskPhone = (phone) => {
      if (!phone) return naLabel;
      if (isMatched) return phone;
      // Mask phone: show first 3 and last 4 digits
      if (phone.length >= 7) {
        return phone.substring(0, 3) + '***' + phone.substring(phone.length - 4);
      }
      return '***';
    };
    
    const maskEmail = (email) => {
      if (!email) return naLabel;
      if (isMatched) return email;
      // Mask email: show first 2 characters and domain
      const [localPart, domain] = email.split('@');
      if (localPart && domain) {
        const maskedLocal = localPart.substring(0, 2) + '***';
        return `${maskedLocal}@${domain}`;
      }
      return '***@***';
    };
    
    // Mask address - hide street address with ***
    const maskAddress = (address) => {
      if (!address) return naLabel;
      if (isMatched) return address;
      // Replace street address with ***, keep city/state
      const parts = address.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        // Mask the first part (street address), keep the rest
        return '*****, ' + parts.slice(1).join(', ');
      }
      // If no comma, mask the whole thing
      return '*****';
    };
    
    const resolveFieldLabel = (key) => getPreviewFieldLabel(key, language, formatApplicationFieldKeyLabel);

    const formatFieldValue = (key, value) => {
      const lowerKey = String(key || '').toLowerCase();
      const dLab = getDeliveryLineLabels(language);

      if (lowerKey === 'deliveries') {
        let deliveriesValue = value;

        if (typeof deliveriesValue === 'string') {
          try {
            deliveriesValue = JSON.parse(deliveriesValue);
          } catch {
            // Keep original string if it's not valid JSON
          }
        }

        const deliveriesArray = Array.isArray(deliveriesValue)
          ? deliveriesValue
          : deliveriesValue && typeof deliveriesValue === 'object'
          ? [deliveriesValue]
          : [];

        if (deliveriesArray.length === 0) {
          return typeof deliveriesValue === 'string' ? deliveriesValue : naLabel;
        }

        const formatted = deliveriesArray.map((item, index) => {
          if (!item || typeof item !== 'object') {
            return `${dLab.deliveryN} ${index + 1}: ${String(item)}`;
          }

          const parts = [];

          const dateValue =
            item.deliveryDate ||
            item.date ||
            (item.deliveryMonth && item.deliveryDay && item.deliveryYear
              ? `${item.deliveryMonth}/${item.deliveryDay}/${item.deliveryYear}`
              : item.deliveryYear
              ? String(item.deliveryYear)
              : item.year
              ? String(item.year)
              : null);

          if (dateValue) parts.push(`${dLab.date}: ${dateValue}`);
          if (item.conceptionMethod) parts.push(`${dLab.conception}: ${item.conceptionMethod}`);
          if (item.deliveryMethod) parts.push(`${dLab.deliveryMethod}: ${item.deliveryMethod}`);
          if (item.pregnancyResult) parts.push(`${dLab.pregnancyResult}: ${item.pregnancyResult}`);
          if (item.gestationWeeks) {
            parts.push(`${dLab.gestation}: ${item.gestationWeeks} ${t('myMatch.weeksUnit')}`);
          }
          if (item.fetusesCount) parts.push(`${dLab.fetuses}: ${item.fetusesCount}`);
          if (item.gender) parts.push(`${dLab.babyGender}: ${item.gender}`);
          if (item.birthWeight) parts.push(`${dLab.birthWeight}: ${item.birthWeight}`);
          if (item.complications) parts.push(`${dLab.complications}: ${item.complications}`);

          if (parts.length === 0) {
            return `${dLab.deliveryN} ${index + 1}: ${JSON.stringify(item)}`;
          }

          return `${dLab.deliveryN} ${index + 1}\n${parts.join('\n')}`;
        });

        return formatted.join('\n\n');
      }

      if (value === null || value === undefined || value === '') return naLabel;
      if (typeof value === 'boolean') return value ? t('profileDetail.yes') : t('profileDetail.no');
      if (Array.isArray(value)) {
        if (value.length === 0) return naLabel;
        return value
          .map((item) => {
            if (item === null || item === undefined || item === '') return null;
            if (typeof item === 'object') return JSON.stringify(item);
            return String(item);
          })
          .filter(Boolean)
          .join(', ');
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      const strValue = String(value);
      if (!isMatched && lowerKey.includes('name')) return maskName(strValue, true);
      if (!isMatched && lowerKey.includes('phone')) return maskPhone(strValue);
      if (!isMatched && lowerKey.includes('email')) return maskEmail(strValue);
      if (!isMatched && lowerKey.includes('address')) return maskAddress(strValue);
      return strValue;
    };

    return (
      <Modal
        visible={showSurrogateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowSurrogateModal(false);
          setSelectedSurrogate(null);
          setSurrogateDetails(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profileDetail.surrogateProfile')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSurrogateModal(false);
                  setSelectedSurrogate(null);
                  setSurrogateDetails(null);
                }}
                style={styles.modalCloseButton}
              >
                <Icon name="x" size={24} color="#1A1D1E" />
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#FF8EA4" />
                <Text style={styles.modalLoadingText}>{t('common.loading')}</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.modalScrollView} 
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Surrogate Photo(s) from application */}
                {(() => {
                  const photoUrls = parsedFormData.photos && Array.isArray(parsedFormData.photos) && parsedFormData.photos.length > 0
                    ? parsedFormData.photos
                    : parsedFormData.photoUrl
                      ? [parsedFormData.photoUrl]
                      : [];
                  if (photoUrls.length === 0) return null;
                  return (
                    <View style={styles.surrogateDetailPhotosSection}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.surrogateDetailPhotosScroll}>
                        {photoUrls.map((uri, index) => (
                          <Image
                            key={index}
                            source={{ uri: typeof uri === 'string' ? uri : uri?.url || uri }}
                            style={styles.surrogateDetailPhoto}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    </View>
                  );
                })()}

                {/* Application content in same order as Become a Surrogate form */}
                {SURROGATE_APPLICATION_STEPS.map(({ step, title, fields }) => {
                  const visibleFields = fields.filter((key) => hasValue(key));
                  if (visibleFields.length === 0) return null;
                  const sectionTitle = getPreviewStepTitle(step, language, title);
                  return (
                    <View key={`step-${step}`} style={styles.detailSection}>
                      <View style={styles.detailSectionHeader}>
                        <Icon name="file-text" size={20} color="#FF8EA4" />
                        <Text style={styles.detailSectionTitle}>{sectionTitle}</Text>
                      </View>
                      {visibleFields.map((key) => {
                        const value = getFieldValue(key);
                        return (
                          <View key={`${step}-${key}`} style={styles.detailInfoRow}>
                            <Text style={styles.detailLabel}>{resolveFieldLabel(key)}</Text>
                            <Text style={styles.detailValue}>{formatFieldValue(key, value)}</Text>
                            {!isMatched && (key === 'phoneNumber' || key === 'phone') && (
                              <Text style={styles.maskedHint}>{t('myMatch.contactVisibleAfterMatch')}</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.mainContainer} edges={['top']}>
      <StatusBar barStyle="light-content" />
      {matchData ? renderMatchedState() : renderUnmatchedState()}
      {renderSurrogateDetailsModal()}
      <ParentMatchSwitcher
        visible={showParentMatchSwitcher}
        onClose={() => setShowParentMatchSwitcher(false)}
        matches={parentMatch.matches}
        activeMatchId={parentMatch.activeMatchId}
        surrogateNames={parentMatch.surrogateNames}
        onSelectMatch={(id) => parentMatch.setActiveMatchId(id)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    flex: 1,
  },
  // Unmatched Styles
  unmatchedContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 24,
    paddingBottom: 120,
  },
  unmatchedContent: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  unmatchedIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  unmatchedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  unmatchedDescription: {
    fontSize: 16,
    color: '#6E7191',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  contactButton: {
    backgroundColor: '#FF8EA4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#FF8EA4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  // Available Surrogates Section
  availableSurrogatesSection: {
    width: '100%',
    marginTop: 32,
    marginBottom: 24,
  },
  availableSurrogatesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  surrogatesList: {
    gap: 12,
  },
  surrogateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  surrogateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  surrogateCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  surrogateName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  surrogatePhone: {
    fontSize: 14,
    color: '#6E7191',
    marginBottom: 4,
  },
  surrogateLocation: {
    fontSize: 12,
    color: '#6E7191',
    flexDirection: 'row',
    alignItems: 'center',
  },
  surrogateAvailableBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  surrogateAvailableBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  noSurrogatesText: {
    fontSize: 14,
    color: '#6E7191',
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  // Premium Header with Gradient Effect (purple)
  gradientHeader: {
    backgroundColor: '#8B5CF6',
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecoration1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: -50,
    right: -50,
  },
  headerDecoration2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    bottom: -30,
    left: -30,
  },
  parentSwitchHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
  },
  parentSwitchHeaderBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  matchAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  avatarWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  avatarShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  matchIconContainer: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  matchIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  matchDate: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Documents Section
  documentsSection: {
    padding: 20,
    paddingTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1D1E',
    letterSpacing: -0.5,
  },
  sectionBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A7BF6',
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  documentCardLocked: {
    backgroundColor: '#FAFBFC',
    opacity: 0.8,
  },
  documentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  documentContent: {
    flex: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D1E',
    flex: 1,
  },
  documentTitleLocked: {
    color: '#A0A3BD',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00B894',
    marginRight: 4,
  },
  availableText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00B894',
  },
  documentStatus: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  documentArrow: {
    marginLeft: 8,
  },
  // Pregnancy History
  pregnancyHistorySection: {
    padding: 20,
    paddingTop: 8,
  },
  pregnancyHistoryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  pregnancyHistoryItem: {
    marginBottom: 16,
  },
  pregnancyHistoryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 8,
  },
  pregnancyHistoryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pregnancyHistoryInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1D1E',
    fontWeight: '600',
    padding: 0,
  },
  savePregnancyHistoryButton: {
    backgroundColor: '#1F6FE0',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePregnancyHistoryButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  savePregnancyHistoryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Quick Actions
  quickActionsSection: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
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
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    marginTop: 16,
    color: '#A0A3BD',
    fontSize: 16,
    fontWeight: '500',
  },
  // Surrogate Details Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    marginTop: 16,
    color: '#6E7191',
    fontSize: 14,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  surrogateDetailPhotosSection: {
    marginBottom: 16,
  },
  surrogateDetailPhotosScroll: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  surrogateDetailPhoto: {
    width: width * 0.7,
    maxWidth: 320,
    height: 280,
    borderRadius: 12,
    backgroundColor: '#F0F4F8',
    marginRight: 12,
  },
  detailSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D1E',
    marginLeft: 8,
  },
  detailInfoRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E7191',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1D1E',
  },
  maskedHint: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6E7191',
    marginTop: 4,
  },
  viewDetailsIcon: {
    marginLeft: 8,
  },
  surrogateCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
