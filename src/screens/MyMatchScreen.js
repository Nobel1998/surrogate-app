import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  RefreshControl,
  Alert,
  Linking
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function MyMatchScreen() {
  const { user, userProfile } = useAuth();
  const [match, setMatch] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [journeyUpdates, setJourneyUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadMatchData();
    }
  }, [user]);

  const loadMatchData = async () => {
    try {
      setLoading(true);

      // 获取当前用户的匹配信息
      const { data: matchData, error: matchError } = await supabase
        .from('matches_with_details')
        .select('*')
        .eq('surrogate_id', user.id)
        .eq('status', 'active')
        .single();

      if (matchError && matchError.code !== 'PGRST116') {
        throw matchError;
      }

      if (matchData) {
        setMatch(matchData);

        // 获取客人详细信息
        const { data: clientData, error: clientError } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('user_id', matchData.client_id)
          .single();

        if (!clientError) {
          setClientProfile(clientData);
        }

        // 获取合同文档
        const { data: contractsData, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('match_id', matchData.id)
          .order('created_at', { ascending: false });

        if (!contractsError) {
          setContracts(contractsData || []);
        }

        // 获取旅程更新
        const { data: updatesData, error: updatesError } = await supabase
          .from('journey_updates')
          .select('*')
          .eq('match_id', matchData.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!updatesError) {
          setJourneyUpdates(updatesData || []);
        }
      }
    } catch (error) {
      console.error('Error loading match data:', error);
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

  const openDocument = async (contract) => {
    if (contract.file_url) {
      try {
        await Linking.openURL(contract.file_url);
      } catch (error) {
        Alert.alert('Error', 'Unable to open document');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'completed': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'contract': return '📄';
      case 'medical': return '🏥';
      case 'legal': return '⚖️';
      case 'insurance': return '🛡️';
      default: return '📎';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your match...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Active Match</Text>
          <Text style={styles.emptyText}>
            You don't have an active match yet. Once you're matched with intended parents, 
            you'll see their information and documents here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Match</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
            <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Client Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Intended Parents</Text>
          </View>
          
          {clientProfile && (
            <View style={styles.clientInfo}>
              {clientProfile.profile_image_url && (
                <Image 
                  source={{ uri: clientProfile.profile_image_url }} 
                  style={styles.clientImage}
                />
              )}
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>
                  {clientProfile.first_name} {clientProfile.last_name}
                  {clientProfile.partner_name && ` & ${clientProfile.partner_name}`}
                </Text>
                <Text style={styles.clientLocation}>
                  📍 {clientProfile.city}, {clientProfile.state}
                </Text>
                {clientProfile.occupation && (
                  <Text style={styles.clientOccupation}>
                    💼 {clientProfile.occupation}
                  </Text>
                )}
                <Text style={styles.matchDate}>
                  Matched on {new Date(match.match_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {match.expected_due_date && (
            <View style={styles.dueDateContainer}>
              <Text style={styles.dueDateLabel}>Expected Due Date</Text>
              <Text style={styles.dueDate}>
                {new Date(match.expected_due_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Contract Documents */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Documents & Contracts</Text>
            <Text style={styles.documentCount}>{contracts.length}</Text>
          </View>
          
          {contracts.length > 0 ? (
            contracts.map((contract) => (
              <TouchableOpacity
                key={contract.id}
                style={styles.documentItem}
                onPress={() => openDocument(contract)}
              >
                <View style={styles.documentInfo}>
                  <Text style={styles.documentIcon}>
                    {getDocumentIcon(contract.document_type)}
                  </Text>
                  <View style={styles.documentDetails}>
                    <Text style={styles.documentTitle}>{contract.title}</Text>
                    <Text style={styles.documentMeta}>
                      {contract.document_type.charAt(0).toUpperCase() + contract.document_type.slice(1)} • 
                      {new Date(contract.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.documentStatus}>
                  {contract.is_signed ? (
                    <Text style={styles.signedBadge}>✅ Signed</Text>
                  ) : (
                    <Text style={styles.pendingBadge}>📝 {contract.status}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyDocuments}>
              <Text style={styles.emptyDocumentsText}>No documents uploaded yet</Text>
            </View>
          )}
        </View>

        {/* Recent Journey Updates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Updates</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {journeyUpdates.length > 0 ? (
            journeyUpdates.map((update) => (
              <View key={update.id} style={styles.updateItem}>
                <View style={styles.updateHeader}>
                  <Text style={styles.updateTitle}>{update.title}</Text>
                  <Text style={styles.updateDate}>
                    {new Date(update.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {update.content && (
                  <Text style={styles.updateContent} numberOfLines={2}>
                    {update.content}
                  </Text>
                )}
                {update.week_number && (
                  <Text style={styles.updateWeek}>Week {update.week_number}</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyUpdates}>
              <Text style={styles.emptyUpdatesText}>No journey updates yet</Text>
            </View>
          )}
        </View>

        {/* Contact Information */}
        {clientProfile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact Information</Text>
            
            {clientProfile.email && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => Linking.openURL(`mailto:${clientProfile.email}`)}
              >
                <Text style={styles.contactIcon}>📧</Text>
                <Text style={styles.contactText}>{clientProfile.email}</Text>
              </TouchableOpacity>
            )}
            
            {clientProfile.phone && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => Linking.openURL(`tel:${clientProfile.phone}`)}
              >
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactText}>{clientProfile.phone}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clientInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  clientImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clientLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clientOccupation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  matchDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  dueDateContainer: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2A7BF6',
  },
  dueDateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2A7BF6',
  },
  documentCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  documentMeta: {
    fontSize: 12,
    color: '#666',
  },
  documentStatus: {
    marginLeft: 12,
  },
  signedBadge: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  pendingBadge: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  emptyDocuments: {
    padding: 20,
    alignItems: 'center',
  },
  emptyDocumentsText: {
    fontSize: 14,
    color: '#666',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  updateItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  updateDate: {
    fontSize: 12,
    color: '#666',
  },
  updateContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  updateWeek: {
    fontSize: 12,
    color: '#2A7BF6',
    fontWeight: '600',
  },
  emptyUpdates: {
    padding: 20,
    alignItems: 'center',
  },
  emptyUpdatesText: {
    fontSize: 14,
    color: '#666',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  contactText: {
    fontSize: 16,
    color: '#2A7BF6',
    flex: 1,
  },
});
