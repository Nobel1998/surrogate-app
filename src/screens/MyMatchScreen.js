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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';
import Avatar from '../components/Avatar';

const { width } = Dimensions.get('window');

export default function MyMatchScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
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

  useEffect(() => {
    loadMatchData();
  }, [user]);

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
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
        match = data?.[0];
        matchError = error;
      } else {
        const { data, error } = await supabase
          .from('surrogate_matches')
          .select('*')
          .eq('parent_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
        match = data?.[0];
        matchError = error;
      }

      if (matchError && matchError.code !== 'PGRST116') {
        console.error('Error loading match:', matchError);
      }
      console.log('[MyMatch] match:', match);

      if (match) {
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
        // Parents see: trust_account (but not in My Match, only in Profile)
        const documentTypes = [
          'surrogacy_contract',
          'legal_contract',
          'agency_contract',
          'insurance_policy',
          'health_insurance_bill',
          'parental_rights',
          'medical_records',
          'parent_contract',
          'surrogate_contract',
          // 'online_claims', // Moved to User Center (ProfileScreen)
          'trust_account', // Add trust_account for parents to see in My Match
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

      // Try to query all active matches at once
      // If RLS blocks this, we'll get an error and handle it
      const { data: allActiveMatches, error: allMatchesError } = await supabase
        .from('surrogate_matches')
        .select('surrogate_id, status, parent_id, first_parent_id')
        .eq('status', 'active');

      let matchedSurrogateIds = new Set();

      if (allMatchesError) {
        console.log('[MyMatch] Cannot query all matches (RLS restriction):', allMatchesError.message);
        console.log('[MyMatch] Checking each surrogate individually...');
        
        // RLS restriction - check each surrogate individually
        // Even if we can't see other parent's matches, we can still check if a surrogate is matched
        // by trying to query their matches (RLS might allow this)
        for (const surrogate of allSurrogates) {
          const { data: matches, error: matchError } = await supabase
            .from('surrogate_matches')
            .select('id, status, surrogate_id')
            .eq('surrogate_id', surrogate.id)
            .eq('status', 'active')
            .limit(1);

          if (matchError) {
            // If we get an error, it might be RLS blocking us
            // But if the surrogate is matched to us, we should see it
            // If matched to someone else, we might not see it
            // For safety, if we can't verify, we'll exclude the surrogate
            console.log(`[MyMatch] Cannot verify match status for ${surrogate.id} (${surrogate.name}), excluding for safety`);
            matchedSurrogateIds.add(surrogate.id);
          } else if (matches && matches.length > 0) {
            matchedSurrogateIds.add(surrogate.id);
            console.log(`[MyMatch] Excluding matched surrogate: ${surrogate.id} (${surrogate.name})`);
          } else {
            // No matches found - surrogate is available
            console.log(`[MyMatch] Surrogate ${surrogate.id} (${surrogate.name}) has no active matches`);
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
        console.log('[MyMatch] All active matches:', allActiveMatches);
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

  const formatMatchDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  // Render Unmatched State
  const renderUnmatchedState = () => {
    const isParent = userRole === 'parent';
    
    return (
    <ScrollView 
      contentContainerStyle={styles.unmatchedContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.unmatchedContent}>
        <View style={styles.unmatchedIconContainer}>
          <Icon name="search" size={64} color="#FF8EA4" />
        </View>
        <Text style={styles.unmatchedTitle}>{t('myMatch.matchingInProgress')}</Text>
        <Text style={styles.unmatchedDescription}>
          {t('myMatch.matchingDescription')}
        </Text>
        
        <View style={styles.timelineSteps}>
          <View style={styles.timelineStep}>
            <View style={[styles.stepDot, styles.stepActive]} />
            <Text style={styles.stepText}>{t('myMatch.profileReview')}</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.timelineStep}>
            <View style={[styles.stepDot, styles.stepPending]} />
            <Text style={styles.stepText}>{t('myMatch.matching')}</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.timelineStep}>
            <View style={[styles.stepDot, styles.stepPending]} />
            <Text style={styles.stepText}>{t('myMatch.confirmation')}</Text>
          </View>
        </View>

          {/* Show available surrogates for parent users */}
          {isParent && (
            <View style={styles.availableSurrogatesSection}>
              <Text style={styles.availableSurrogatesTitle}>Available Surrogates</Text>
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
                          <Text style={styles.surrogateName}>{surrogate.name || 'Surrogate'}</Text>
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
                            <Text style={styles.surrogateAvailableBadgeText}>Available</Text>
                          </View>
                          <Icon name="chevron-right" size={20} color="#6E7191" style={styles.viewDetailsIcon} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noSurrogatesText}>No available surrogates at the moment.</Text>
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
        documentType: 'legal_contract',
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
      // Trust Account - only visible to parents
      ...(isSurrogate ? [] : [{
        key: 'trust_account',
        label: t('myMatch.trustAccount'),
        icon: 'dollar-sign',
        iconColor: '#00B894',
        documentType: 'trust_account',
      }]),
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
                      if (doc.documentType === 'legal_contract') {
                        docData = documents.find(d => 
                          d.document_type === 'legal_contract' && 
                          (d.user_id === user.id || d.user_id === (isSurrogate ? matchData?.parent_id : matchData?.surrogate_id))
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
                if (doc.documentType === 'legal_contract') {
                  // For Attorney Retainer Agreement, only look for legal_contract type
                  // Check both current user and partner user (for match-uploaded files)
                  docData = documents.find(d => 
                    d.document_type === 'legal_contract' && 
                    (d.user_id === user.id || d.user_id === (isSurrogate ? matchData?.parent_id : matchData?.surrogate_id))
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
                if (doc.key === 'intended_parents_profile' && partnerProfile) {
                  navigation.navigate('IntendedParentsProfile', { 
                    profile: partnerProfile,
                    application: partnerApplication,
                  });
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8EA4" />
        <Text style={styles.loadingText}>{t('myMatch.loadingMatchInfo')}</Text>
      </View>
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
                <Text style={styles.modalTitle}>Surrogate Profile</Text>
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
                <Text style={styles.modalLoadingText}>Loading details...</Text>
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
    
    console.log('[MyMatch] Rendering modal with data:', {
      hasProfile: !!profile,
      hasSelectedSurrogate: !!selectedSurrogate,
      profileName: surrogateProfile?.name,
      profilePhone: surrogateProfile?.phone,
      profileEmail: surrogateProfile?.email,
      profileLocation: surrogateProfile?.location,
      formDataKeys: Object.keys(parsedFormData || {}),
      allProfileKeys: profile ? Object.keys(profile) : 'No profile',
      isMatched: isMatched,
    });
    
    // Helper function to mask sensitive information
    const maskPhone = (phone) => {
      if (!phone) return 'N/A';
      if (isMatched) return phone;
      // Mask phone: show first 3 and last 4 digits
      if (phone.length >= 7) {
        return phone.substring(0, 3) + '***' + phone.substring(phone.length - 4);
      }
      return '***';
    };
    
    const maskEmail = (email) => {
      if (!email) return 'N/A';
      if (isMatched) return email;
      // Mask email: show first 2 characters and domain
      const [localPart, domain] = email.split('@');
      if (localPart && domain) {
        const maskedLocal = localPart.substring(0, 2) + '***';
        return `${maskedLocal}@${domain}`;
      }
      return '***@***';
    };
    
    // Mask address - show only city/state, hide street address
    const maskAddress = (address) => {
      if (!address) return 'N/A';
      if (isMatched) return address;
      // Try to extract only the last part (city/state/zip)
      const parts = address.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        // Show only the last part (city or state)
        return parts[parts.length - 1] + ' (Full address available after matching)';
      }
      // If no comma, just mask everything
      return '*** (Full address available after matching)';
    };
    
    // Location doesn't need masking as it's already general information

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
              <Text style={styles.modalTitle}>Surrogate Profile</Text>
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
                <Text style={styles.modalLoadingText}>Loading details...</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.modalScrollView} 
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Basic Information */}
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Icon name="user" size={20} color="#FF8EA4" />
                    <Text style={styles.detailSectionTitle}>Basic Information</Text>
                  </View>
                  
                  {/* Name - Always show */}
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>
                      {surrogateProfile?.name || selectedSurrogate?.name || 'N/A'}
                    </Text>
                  </View>

                  {/* Phone - Mask if not matched */}
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>
                      {maskPhone(surrogateProfile?.phone || selectedSurrogate?.phone)}
                    </Text>
                    {!isMatched && (
                      <Text style={styles.maskedHint}>Contact information will be available after matching</Text>
                    )}
                  </View>

                  {/* Email - Mask if not matched */}
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>
                      {maskEmail(surrogateProfile?.email)}
                    </Text>
                  </View>

                  {/* Location - Always show (already general information) */}
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                      {surrogateProfile?.location || selectedSurrogate?.location || 'N/A'}
                    </Text>
                  </View>

                  {/* Address - Masked if not matched */}
                  {(parsedFormData.address || surrogateProfile?.address) && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.detailValue}>
                        {maskAddress(parsedFormData.address || surrogateProfile?.address)}
                      </Text>
                    </View>
                  )}

                  {parsedFormData.age && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Age</Text>
                      <Text style={styles.detailValue}>{parsedFormData.age}</Text>
                    </View>
                  )}

                  {parsedFormData.dateOfBirth && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Date of Birth</Text>
                      <Text style={styles.detailValue}>{parsedFormData.dateOfBirth}</Text>
                    </View>
                  )}

                  {parsedFormData.race && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Race</Text>
                      <Text style={styles.detailValue}>{parsedFormData.race}</Text>
                    </View>
                  )}
                </View>

                {/* Medical Information */}
                {(parsedFormData.previousPregnancies || parsedFormData.previousSurrogacy !== undefined || parsedFormData.bmi) && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Icon name="heart" size={20} color="#FF8EA4" />
                      <Text style={styles.detailSectionTitle}>Medical Information</Text>
                    </View>

                    {parsedFormData.previousPregnancies && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Previous Pregnancies</Text>
                        <Text style={styles.detailValue}>{parsedFormData.previousPregnancies}</Text>
                      </View>
                    )}

                    {parsedFormData.previousSurrogacy !== undefined && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Previous Surrogacy Experience</Text>
                        <Text style={styles.detailValue}>{parsedFormData.previousSurrogacy ? 'Yes' : 'No'}</Text>
                      </View>
                    )}

                    {parsedFormData.bmi && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>BMI</Text>
                        <Text style={styles.detailValue}>{parsedFormData.bmi}</Text>
                      </View>
                    )}

                    {parsedFormData.pregnancyComplications && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Pregnancy Complications</Text>
                        <Text style={styles.detailValue}>{parsedFormData.pregnancyComplications}</Text>
                      </View>
                    )}

                    {parsedFormData.currentMedications && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Current Medications</Text>
                        <Text style={styles.detailValue}>{parsedFormData.currentMedications}</Text>
                      </View>
                    )}

                    {parsedFormData.healthConditions && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Health Conditions</Text>
                        <Text style={styles.detailValue}>{parsedFormData.healthConditions}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Lifestyle Information */}
                {(parsedFormData.smokingStatus || parsedFormData.employmentStatus || parsedFormData.exerciseRoutine) && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Icon name="activity" size={20} color="#FF8EA4" />
                      <Text style={styles.detailSectionTitle}>Lifestyle Information</Text>
                    </View>

                    {parsedFormData.smokingStatus && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Smoking Status</Text>
                        <Text style={styles.detailValue}>{parsedFormData.smokingStatus}</Text>
                      </View>
                    )}

                    {parsedFormData.alcoholUsage && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Alcohol Usage</Text>
                        <Text style={styles.detailValue}>{parsedFormData.alcoholUsage}</Text>
                      </View>
                    )}

                    {parsedFormData.exerciseRoutine && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Exercise Routine</Text>
                        <Text style={styles.detailValue}>{parsedFormData.exerciseRoutine}</Text>
                      </View>
                    )}

                    {parsedFormData.employmentStatus && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Employment Status</Text>
                        <Text style={styles.detailValue}>{parsedFormData.employmentStatus}</Text>
                      </View>
                    )}

                    {parsedFormData.supportSystem && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Support System</Text>
                        <Text style={styles.detailValue}>{parsedFormData.supportSystem}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Additional Information */}
                {(parsedFormData.timelineAvailability || parsedFormData.travelWillingness !== undefined || parsedFormData.additionalComments) && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Icon name="info" size={20} color="#FF8EA4" />
                      <Text style={styles.detailSectionTitle}>Additional Information</Text>
                    </View>

                    {parsedFormData.timelineAvailability && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Timeline Availability</Text>
                        <Text style={styles.detailValue}>{parsedFormData.timelineAvailability}</Text>
                      </View>
                    )}

                    {parsedFormData.travelWillingness !== undefined && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Travel Willingness</Text>
                        <Text style={styles.detailValue}>{parsedFormData.travelWillingness ? 'Yes' : 'No'}</Text>
                      </View>
                    )}

                    {parsedFormData.specialPreferences && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Special Preferences</Text>
                        <Text style={styles.detailValue}>{parsedFormData.specialPreferences}</Text>
                      </View>
                    )}

                    {parsedFormData.additionalComments && (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Additional Comments</Text>
                        <Text style={styles.detailValue}>{parsedFormData.additionalComments}</Text>
                      </View>
                    )}
                  </View>
                )}
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
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  unmatchedContent: {
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
  timelineSteps: {
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  stepActive: {
    backgroundColor: '#FF8EA4',
    shadowColor: '#FF8EA4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  stepPending: {
    backgroundColor: '#E0E7EE',
  },
  stepText: {
    fontSize: 15,
    color: '#4E5D78',
    fontWeight: '600',
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E7EE',
    marginLeft: 7,
    marginVertical: 6,
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
    maxHeight: 400,
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
  // Premium Header with Gradient Effect
  gradientHeader: {
    backgroundColor: '#FF8EA4',
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#FF8EA4',
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
