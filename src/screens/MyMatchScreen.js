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
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('surrogate');

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
        }

        setMatchData(match);

        // 4) 文档 - 查询当前用户自己的文档
        // 管理员上传合同时，会为 parent 插入 parent_contract，为 surrogate 插入 surrogate_contract
        // 所以我们需要查询当前用户自己的文档
        const currentUserId = user.id;
        const GLOBAL_CONTRACT_USER_ID = '00000000-0000-0000-0000-000000000000';
        const userIdOrClause = [
          currentUserId ? `user_id.eq.${currentUserId}` : null,
          `user_id.eq.${GLOBAL_CONTRACT_USER_ID}`,
          'user_id.is.null',
        ]
          .filter(Boolean)
          .join(',');

        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .in('document_type', [
            'surrogacy_contract',
            'legal_contract',
            'agency_contract',
            'insurance_policy',
            'health_insurance_bill',
            'parental_rights',
            'medical_records',
            'parent_contract',
            'surrogate_contract',
            'online_claims',
            'agency_retainer',
            'hipaa_release',
          ])
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
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error in loadMatchData:', error);
      Alert.alert('Error', 'Failed to load match information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatchData();
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

  const formatMatchDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  // Render Unmatched State
  const renderUnmatchedState = () => (
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

        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => Linking.openURL('mailto:support@agency.com')}
        >
          <Text style={styles.contactButtonText}>{t('myMatch.contactAgency')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render Matched State with Premium Design
  const renderMatchedState = () => {
    const isSurrogate = userRole === 'surrogate';
    const partnerName = partnerProfile?.name || 'Partner';
    const userName = user?.name || 'You';
    const matchDate = formatMatchDate(matchData?.created_at);
    
    // Document configuration based on role
    const documentConfig = [
      {
        key: 'intended_parents_profile',
        label: t('myMatch.intendedParentsProfile'),
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
      {
        key: 'online_claims',
        label: t('myMatch.onlineClaims'),
        icon: 'check-circle',
        iconColor: '#6C5CE7',
        documentType: 'online_claims',
      },
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
              <Text style={styles.sectionBadgeText}>{documents.length} {t('myMatch.available')}</Text>
            </View>
          </View>

          <View style={styles.documentsList}>
            {documentConfig.map((doc) => {
              let docData = null;
              if (doc.documentType) {
                if (doc.documentType === 'legal_contract') {
                  // For Attorney Retainer Agreement, only look for legal_contract type
                  docData = documents.find(d => d.document_type === 'legal_contract');
                } else {
                  docData = documents.find(d => d.document_type === doc.documentType);
                }
              }
              
              const isAvailable = doc.alwaysAvailable || !!docData;
              const isLocked = !isAvailable;
              
              // Special handling for Intended Parents Profile
              const handlePress = () => {
                if (doc.key === 'intended_parents_profile' && partnerProfile) {
                  navigation.navigate('IntendedParentsProfile', { profile: partnerProfile });
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

  return (
    <SafeAreaView style={styles.mainContainer} edges={['top']}>
      <StatusBar barStyle="light-content" />
      {matchData ? renderMatchedState() : renderUnmatchedState()}
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
});
