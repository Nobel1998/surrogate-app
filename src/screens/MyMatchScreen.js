import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Feather as Icon } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function MyMatchScreen({ navigation }) {
  const { user } = useAuth();
  const [matchData, setMatchData] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null); // 对方资料（代母/客人）
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('surrogate'); // 默认代母

  useEffect(() => {
    loadMatchData();
  }, [user]);

  const loadMatchData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1) 加载当前用户的角色（profiles 表中的 role 字段）
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

      // 2) 根据角色加载匹配信息
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
        // 客人侧：直接以 auth 用户 id 作为 parent 关联
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

      if (match) {
        // 3) 加载对方资料
        if (isSurrogate && match.parent_id) {
          const { data: parentProfile, error: parentError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', match.parent_id)
            .single();

          if (parentError && parentError.code !== 'PGRST116') {
            console.error('Error loading parent profile:', parentError);
          } else {
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
            setPartnerProfile(surrogateProfile);
          }
        }

        // 4) 合并匹配信息
        setMatchData(match);

        // 5) 加载相关文档：代母上传的文档由双方查看，因此取代母 id
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
        }
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

  const renderMenuItem = (label, iconName, iconColor, onPress, isLock = false) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>
          <Icon name={isLock ? 'lock' : iconName} size={20} color={isLock ? '#999' : iconColor} />
        </View>
        <Text style={[styles.menuItemText, isLock && styles.disabledText]}>{label}</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  // 映射文档类型到列表显示名称
  const getDocumentLabel = (type) => {
    const names = {
      surrogacy_contract: 'Surrogacy Contract',
      legal_contract: 'Attorney Retainer Agreement',
      agency_contract: 'Agency Contract',
      insurance_policy: 'Surrogate Life Insurance Policy',
      parental_rights: 'PBO (Parental Birth Order)',
      medical_records: 'Surrogate Health Insurance Bill',
    };
    return names[type] || 'Document';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8EA4" />
        <Text style={styles.loadingText}>Loading match info...</Text>
      </View>
    );
  }

  const isSurrogate = userRole === 'surrogate';
  const matchDate = matchData ? new Date(matchData.created_at).toLocaleDateString() : '---';
  const partnerName = partnerProfile?.name || (isSurrogate ? 'Waiting...' : 'Surrogate');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8EA4" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8EA4" />
        }
      >
        {/* Hero Section with Curve */}
        <View style={styles.heroContainer}>
          <View style={styles.heroContent}>
            {/* User Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'M'}</Text>
              </View>
              <Text style={styles.avatarLabel}>{user?.name || 'Me'}</Text>
            </View>

            {/* Match Connection */}
            <View style={styles.matchConnection}>
              <View style={styles.checkCircle}>
                <Icon name="check" size={40} color="#FF8EA4" />
              </View>
              <Text style={styles.matchDateText}>{matchDate}</Text>
            </View>

            {/* Partner Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                {partnerProfile?.name ? (
                  <Text style={styles.avatarText}>{partnerProfile.name?.charAt(0)}</Text>
                ) : (
                  <Icon name="user" size={30} color="#FF8EA4" />
                )}
              </View>
              <Text style={styles.avatarLabel}>{partnerName}</Text>
            </View>
          </View>
          
          {/* Curved Bottom Background */}
          <View style={styles.curveBackground} />
        </View>

        {/* List Section */}
        <View style={styles.listContainer}>
          
          {/* Profile */}
          {renderMenuItem(
            isSurrogate ? 'Intended Parents Profile' : 'Surrogate Profile', 
            'tag', 
            '#FF9800', 
            () => {
              if (partnerProfile) {
                // Debug log to ensure location is populated
                console.log('Partner profile for display:', partnerProfile);
                const location = partnerProfile.location || partnerProfile.address || '';
                Alert.alert(
                  isSurrogate ? 'IP Profile' : 'Surrogate Profile',
                  `Name: ${partnerProfile.name || ''}\nEmail: ${partnerProfile.email || ''}\nPhone: ${partnerProfile.phone || ''}\nLocation: ${location}\nBio: ${partnerProfile.background || ''}`
                );
              } else {
                Alert.alert('Info', 'No match found yet.');
              }
            }
          )}

          {/* Documents - Dynamically rendered or placeholders */}
          {/* We map common document types to the UI list. If doc exists, it's clickable. If not, it shows as locked/grey */}
          
          {renderMenuItem(
            'Attorney Retainer Agreement', 
            'file-text', 
            '#999', 
            () => handleDocumentPress(documents.find(d => d.document_type === 'legal_contract') || {}),
            !documents.find(d => d.document_type === 'legal_contract')
          )}

          {renderMenuItem(
            'Surrogacy Contract', 
            'file-text', 
            '#999', 
            () => handleDocumentPress(documents.find(d => d.document_type === 'surrogacy_contract') || {}),
            !documents.find(d => d.document_type === 'surrogacy_contract')
          )}

          {renderMenuItem(
            'Surrogate Life Insurance Policy', 
            'shield', 
            '#999', 
            () => handleDocumentPress(documents.find(d => d.document_type === 'insurance_policy') || {}),
            !documents.find(d => d.document_type === 'insurance_policy')
          )}

          {renderMenuItem(
            'Surrogate Health Insurance Bill', 
            'activity', 
            '#999', 
            () => handleDocumentPress(documents.find(d => d.document_type === 'medical_records') || {}),
            !documents.find(d => d.document_type === 'medical_records')
          )}

          {renderMenuItem(
            'PBO (Parental Birth Order)', 
            'file', 
            '#999', 
            () => handleDocumentPress(documents.find(d => d.document_type === 'parental_rights') || {}),
            !documents.find(d => d.document_type === 'parental_rights')
          )}

          {/* New Features */}
          {renderMenuItem(
            'Online Claims', 
            'file-text', 
            '#9C27B0', 
            () => Alert.alert('Coming Soon', 'Online claims feature will be available soon.')
          )}

          {renderMenuItem(
            'Payment Record', 
            'dollar-sign', 
            '#4CAF50', 
            () => Alert.alert('Coming Soon', 'Payment records will be available soon.')
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    backgroundColor: '#FF8EA4',
    paddingTop: 60, // Safe area roughly
    paddingBottom: 40,
    position: 'relative',
    marginBottom: 20,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    zIndex: 2,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    alignItems: 'center',
    width: 80,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF8EA4',
  },
  avatarLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  matchConnection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  matchDateText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  curveBackground: {
    position: 'absolute',
    bottom: -30,
    left: -10,
    right: -10,
    height: 60,
    backgroundColor: '#F8F9FB',
    borderTopLeftRadius: width / 2,
    borderTopRightRadius: width / 2,
    transform: [{ scaleX: 1.2 }], // Stretch the curve
    zIndex: 1,
  },
  listContainer: {
    paddingHorizontal: 0, // Full width items
    paddingBottom: 40,
    backgroundColor: '#F8F9FB',
    zIndex: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    marginBottom: 1, // Thin separator
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  disabledText: {
    color: '#999',
  },
});

