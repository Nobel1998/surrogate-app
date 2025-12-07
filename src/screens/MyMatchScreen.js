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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';

export default function MyMatchScreen({ navigation }) {
  const { user } = useAuth();
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

        // 4) 文档
        const targetUserId = isSurrogate ? user.id : match.surrogate_id;
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', targetUserId)
          .in('document_type', [
            'surrogacy_contract',
            'legal_contract',
            'agency_contract',
            'insurance_policy',
            'parental_rights',
            'medical_records'
          ])
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
    if (document.file_url) {
      try {
        const supported = await Linking.canOpenURL(document.file_url);
        if (supported) {
          await Linking.openURL(document.file_url);
        } else {
          Alert.alert('Error', 'Cannot open this document');
        }
      } catch (error) {
        console.error('Error opening document:', error);
        Alert.alert('Error', 'Failed to open document');
      }
    } else {
      Alert.alert('Info', 'Document file is not available yet');
    }
  };

  // Render Unmatched State
  const renderUnmatchedState = () => (
    <ScrollView 
      contentContainerStyle={styles.unmatchedContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.unmatchedContent}>
        <View style={styles.unmatchedIconContainer}>
          <Icon name="search" size={48} color="#2A7BF6" />
        </View>
        <Text style={styles.unmatchedTitle}>Matching in Progress</Text>
        <Text style={styles.unmatchedDescription}>
          Our team is carefully reviewing profiles to find your perfect match. 
          You will be notified once a connection is made.
        </Text>
        
        <View style={styles.timelineSteps}>
          <View style={styles.timelineStep}>
            <View style={[styles.stepDot, styles.stepActive]} />
            <Text style={styles.stepText}>Profile Review</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.timelineStep}>
            <View style={[styles.stepDot, styles.stepPending]} />
            <Text style={styles.stepText}>Matching</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.timelineStep}>
            <View style={[styles.stepDot, styles.stepPending]} />
            <Text style={styles.stepText}>Confirmation</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => Linking.openURL('mailto:support@agency.com')}
        >
          <Text style={styles.contactButtonText}>Contact Agency</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render Matched State
  const renderMatchedState = () => {
    const isSurrogate = userRole === 'surrogate';
    const partnerName = partnerProfile?.name || 'Partner';
    const partnerRole = isSurrogate ? 'Intended Parent' : 'Surrogate';
    
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Premium Header Card */}
        <View style={styles.profileHeader}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{partnerName.charAt(0)}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Active Match</Text>
              </View>
            </View>
            
            <Text style={styles.partnerName}>{partnerName}</Text>
            <Text style={styles.partnerRole}>{partnerRole}</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Icon name="map-pin" size={16} color="#6E7191" />
                <Text style={styles.infoText}>{partnerProfile?.location || 'Location N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="phone" size={16} color="#6E7191" />
                <Text style={styles.infoText}>{partnerProfile?.phone || 'Phone N/A'}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => partnerProfile?.phone && Linking.openURL(`tel:${partnerProfile.phone}`)}
              >
                <View style={styles.actionIconCircle}>
                  <Icon name="phone" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Call</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => partnerProfile?.email && Linking.openURL(`mailto:${partnerProfile.email}`)}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#FF8EA4' }]}>
                  <Icon name="mail" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Documents Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Important Documents</Text>
          <View style={styles.documentsList}>
            {/* Document items rendering */}
            {[
              { key: 'legal_contract', label: 'Legal Contract', icon: 'file-text' },
              { key: 'medical_records', label: 'Medical Records', icon: 'activity' },
              { key: 'insurance_policy', label: 'Insurance Policy', icon: 'shield' },
            ].map((doc) => {
              const docData = documents.find(d => d.document_type === doc.key);
              const isLocked = !docData;
              
              return (
                <TouchableOpacity 
                  key={doc.key}
                  style={styles.documentCard}
                  onPress={() => handleDocumentPress(docData || {})}
                  disabled={isLocked}
                >
                  <View style={[styles.docIconBox, isLocked && styles.docIconLocked]}>
                    <Icon name={isLocked ? 'lock' : doc.icon} size={24} color={isLocked ? '#A0A3BD' : '#2A7BF6'} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docTitle, isLocked && styles.docTextLocked]}>{doc.label}</Text>
                    <Text style={styles.docStatus}>
                      {isLocked ? 'Pending Upload' : 'Available for View'}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#E0E7EE" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A7BF6" />
        <Text style={styles.loadingText}>Loading match info...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      {matchData ? renderMatchedState() : renderUnmatchedState()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
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
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  unmatchedIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  unmatchedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  unmatchedDescription: {
    fontSize: 16,
    color: '#6E7191',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  contactButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A7BF6',
  },
  contactButtonText: {
    color: '#2A7BF6',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Matched Styles
  profileHeader: {
    padding: 20,
    paddingTop: 10,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2A7BF6',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    backgroundColor: '#00C48C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  partnerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  partnerRole: {
    fontSize: 14,
    color: '#A0A3BD',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#4E5D78',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A7BF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#2A7BF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#6E7191',
    fontWeight: '500',
  },
  sectionContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 16,
    marginLeft: 4,
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  docIconLocked: {
    backgroundColor: '#F5F7FA',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  docTextLocked: {
    color: '#A0A3BD',
  },
  docStatus: {
    fontSize: 12,
    color: '#A0A3BD',
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
  // Timeline Steps in Unmatched
  timelineSteps: {
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  stepActive: {
    backgroundColor: '#2A7BF6',
    shadowColor: '#2A7BF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  stepPending: {
    backgroundColor: '#E0E7EE',
  },
  stepText: {
    fontSize: 14,
    color: '#4E5D78',
    fontWeight: '500',
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E0E7EE',
    marginLeft: 5, // Center with dot
    marginVertical: 4,
  }
});

