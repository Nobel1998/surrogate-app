import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';

export default function ApplicationHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected, completed
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态

  useFocusEffect(
    React.useCallback(() => {
      loadApplications();
    }, [])
  );

  const loadApplications = async () => {
    try {
      setIsLoading(true); // 开始加载
      console.log('📱 Loading applications for ApplicationHistoryScreen...');
      
      // 首先尝试从Supabase获取真实申请数据
      await loadFromSupabaseFirst();
      
    } catch (error) {
      console.error('Error loading applications:', error);
      // 如果Supabase失败，尝试从本地缓存加载（仅作为最后的后备方案）
      // 但优先显示空状态，避免显示过时的数据
      try {
        const storedApplications = await AsyncStorageLib.getItem('user_applications');
        if (storedApplications) {
          const localApps = JSON.parse(storedApplications);
          console.log(`⚠️ Using cached data as fallback: ${localApps.length} applications`);
          setApplications(localApps);
        } else {
          setApplications([]);
        }
      } catch (fallbackError) {
        console.error('Error loading fallback data:', fallbackError);
        setApplications([]);
      }
    } finally {
      setIsLoading(false); // 完成加载
    }
  };

  const loadFromSupabaseFirst = async () => {
    try {
      // 检查用户是否登录
      if (!user || !user.id) {
        console.log('⚠️ User not logged in, cannot load applications');
        setApplications([]);
        await AsyncStorageLib.removeItem('user_applications');
        Alert.alert(
          'Login Required',
          'Please log in to view your applications.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('🌐 Fetching applications from Supabase for user:', user.id);
      
      // 获取当前Supabase认证用户ID
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Auth error:', authError);
        setApplications([]);
        await AsyncStorageLib.removeItem('user_applications');
        Alert.alert(
          'Authentication Error',
          'Please log in again to view your applications.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('🔐 Authenticated user ID:', authUser.id);
      
      // 只查询当前用户的申请
      const { data: supabaseApps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', authUser.id)  // 只获取当前用户的申请
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`📊 Found ${supabaseApps?.length || 0} applications for current user`);

      if (supabaseApps && supabaseApps.length > 0) {
        // 转换Supabase数据为显示格式
        const formattedApps = supabaseApps.map(app => {
          let formData = {};
          try {
            if (app.form_data) {
              formData = JSON.parse(app.form_data);
            }
          } catch (e) {
            console.error('Error parsing form_data:', e);
          }

          return {
            id: `APP-${app.id}`,
            type: 'Surrogacy Application',
            status: app.status || 'pending',
            submittedDate: new Date(app.created_at).toLocaleDateString(),
            lastUpdated: app.updated_at ? new Date(app.updated_at).toLocaleDateString() : new Date(app.created_at).toLocaleDateString(),
            description: `Surrogacy Application - ${app.full_name || formData.fullName || 'Applicant'}`,
            nextStep: getNextStepByStatus(app.status || 'pending'),
            documents: ['Application Form', 'Personal Information', 'Medical History', 'Background Check'],
            notes: getStatusNotes(app.status || 'pending'),
            // 保存原始数据用于调试
            originalId: app.id,
            fullName: app.full_name || formData.fullName || 'Unknown',
            phone: app.phone || formData.phoneNumber || 'N/A',
            email: formData.email || 'N/A'
          };
        });

        console.log('✅ Formatted applications:', formattedApps.length);
        setApplications(formattedApps);
        
        // 同时保存到本地作为缓存
        await AsyncStorageLib.setItem('user_applications', JSON.stringify(formattedApps));
        return;
      }

      // 如果Supabase没有数据，清空本地缓存并显示空状态
      console.log('ℹ️ No applications in Supabase, clearing local cache...');
      setApplications([]);
      await AsyncStorageLib.removeItem('user_applications');
      console.log('✅ Local cache cleared, showing empty state');
      
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      await loadLocalFallback();
    }
  };

  const loadLocalFallback = async () => {
    try {
      console.log('💾 Loading from local storage as fallback...');
      
      const storedApplications = await AsyncStorageLib.getItem('user_applications');
      
      if (storedApplications) {
        const localApps = JSON.parse(storedApplications);
        setApplications(localApps);
        console.log(`📱 Loaded ${localApps.length} applications from local storage`);
      } else {
        // 默认mock数据
        const mockApplications = [
          {
            id: 'APP-DEMO-001',
            type: 'Surrogate Application (Demo)',
            status: 'pending',
            submittedDate: '2024-01-15',
            lastUpdated: '2024-01-20',
            description: 'Demo Application - Please submit a real application',
            nextStep: 'Submit real application via the app',
            documents: ['Demo Application'],
            notes: 'This is demo data. Please create a real application.',
          }
        ];
        
        setApplications(mockApplications);
        await AsyncStorageLib.setItem('user_applications', JSON.stringify(mockApplications));
        console.log('📝 Created demo application data');
      }
    } catch (error) {
      console.error('Error loading local fallback:', error);
      setApplications([]);
    }
  };

  const getNextStepByStatus = (status) => {
    switch (status) {
      case 'approved': return 'Congratulations! Wait for matching with intended parents';
      case 'rejected': return 'Please contact us to discuss your application';
      case 'pending': return 'Wait for admin review and approval';
      default: return 'Contact support for more information';
    }
  };

  const getStatusNotes = (status) => {
    switch (status) {
      case 'approved': return 'Your application has been approved! Our team will contact you with next steps.';
      case 'rejected': return 'Your application needs attention. Please contact our support team.';
      case 'pending': return 'Your application is being reviewed by our team.';
      default: return 'Application status updated by admin.';
    }
  };


  const onRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    try {
      await loadFromSupabaseFirst(); // 刷新时直接调用 Supabase 加载，不设置 isLoading
      console.log('✅ Refresh completed');
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'approved': return '#28A745';
      case 'rejected': return '#DC3545';
      case 'completed': return '#6C757D';
      default: return '#6C757D';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'completed': return '🏁';
      default: return '❓';
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const getApplicationDetails = (application) => {
    Alert.alert(
      `Application Details - ${application.id}`,
      `Type: ${application.type}\nStatus: ${getStatusText(application.status)}\nSubmitted: ${application.submittedDate}\nLast Updated: ${application.lastUpdated}\n\nDescription: ${application.description}\n\nNext Step: ${application.nextStep}\n\nNotes: ${application.notes}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'View Documents', onPress: () => showDocuments(application) }
      ]
    );
  };

  const showDocuments = (application) => {
    Alert.alert(
      'Application Documents',
      `Application ID: ${application.id}\n\nDocument List:\n${application.documents.map((doc, index) => `${index + 1}. ${doc}`).join('\n')}`,
      [{ text: 'OK' }]
    );
  };

  const createNewApplication = () => {
    Alert.alert(
      'Create New Application',
      'Select application type',
      [
        { text: 'Surrogacy Application', onPress: () => navigation.navigate('SurrogateApplication') },
        { text: 'Medical Clearance', onPress: () => console.log('Create medical clearance application') },
        { text: 'Legal Documentation', onPress: () => console.log('Create legal documentation application') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2A7BF6"
          title="Pull to sync status..."
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Application History</Text>
        <Text style={styles.subtitle}>View all your application records</Text>
      </View>

      {/* 加载状态 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2A7BF6" />
          <Text style={styles.loadingText}>Loading your applications...</Text>
        </View>
      ) : (
        <>
          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                  All ({applications.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
                onPress={() => setFilter('pending')}
              >
                <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
                  Pending ({applications.filter(app => app.status === 'pending').length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.filterButton, filter === 'approved' && styles.activeFilter]}
                onPress={() => setFilter('approved')}
              >
                <Text style={[styles.filterText, filter === 'approved' && styles.activeFilterText]}>
                  Approved ({applications.filter(app => app.status === 'approved').length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.filterButton, filter === 'rejected' && styles.activeFilter]}
                onPress={() => setFilter('rejected')}
              >
                <Text style={[styles.filterText, filter === 'rejected' && styles.activeFilterText]}>
                  Rejected ({applications.filter(app => app.status === 'rejected').length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.filterButton, filter === 'completed' && styles.activeFilter]}
                onPress={() => setFilter('completed')}
              >
                <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>
                  Completed ({applications.filter(app => app.status === 'completed').length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Application Records</Text>
              <Text style={styles.emptyDescription}>
                {filter === 'all' 
                  ? 'You haven\'t submitted any applications yet'
                  : `No ${getStatusText(filter).toLowerCase()} applications`
                }
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={createNewApplication}>
                <Text style={styles.createButtonText}>Create New Application</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.applicationsList}>
              {filteredApplications.map((application) => (
                <TouchableOpacity
                  key={application.id}
                  style={styles.applicationCard}
                  onPress={() => getApplicationDetails(application)}
                >
                  <View style={styles.applicationHeader}>
                    <View style={styles.applicationInfo}>
                      <Text style={styles.applicationId}>{application.id}</Text>
                      <Text style={styles.applicationType}>{application.type}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
                      <Text style={styles.statusIcon}>{getStatusIcon(application.status)}</Text>
                      <Text style={styles.statusText}>{getStatusText(application.status)}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.applicationDescription}>{application.description}</Text>
                  
                  <View style={styles.applicationFooter}>
                    <Text style={styles.dateText}>Submitted: {application.submittedDate}</Text>
                    <Text style={styles.dateText}>Updated: {application.lastUpdated}</Text>
                  </View>
                  
                  <View style={styles.nextStepContainer}>
                    <Text style={styles.nextStepLabel}>Next Step:</Text>
                    <Text style={styles.nextStepText}>{application.nextStep}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Create New Application Button */}
          {filteredApplications.length > 0 && (
            <View style={styles.createButtonContainer}>
              <TouchableOpacity style={styles.createButton} onPress={createNewApplication}>
                <Text style={styles.createButtonText}>+ Create New Application</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollContent: {
    paddingBottom: 60,
    paddingTop: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A7BF6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  activeFilter: {
    backgroundColor: '#2A7BF6',
    borderColor: '#2A7BF6',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  applicationsList: {
    paddingHorizontal: 20,
  },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  applicationInfo: {
    flex: 1,
  },
  applicationId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  applicationType: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  applicationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  applicationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  nextStepContainer: {
    backgroundColor: '#F8F9FB',
    padding: 8,
    borderRadius: 6,
  },
  nextStepLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  nextStepText: {
    fontSize: 12,
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#2A7BF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});
