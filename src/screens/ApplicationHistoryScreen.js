import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AsyncStorageLib from '../utils/Storage';

export default function ApplicationHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected, completed

  useFocusEffect(
    React.useCallback(() => {
      loadApplications();
    }, [])
  );

  const loadApplications = async () => {
    try {
      // Try to load from AsyncStorage first
      const storedApplications = await AsyncStorageLib.getItem('user_applications');
      
      if (storedApplications) {
        const parsedApps = JSON.parse(storedApplications);
        setApplications(parsedApps);
      } else {
        // Default mock data in English
        const mockApplications = [
          {
            id: 'APP-001',
            type: 'Surrogate Application',
            status: 'approved',
            submittedDate: '2024-01-15',
            lastUpdated: '2024-01-20',
            description: 'Surrogacy Application - Initial review approved',
            nextStep: 'Wait for matching with intended parents',
            documents: ['Identity Proof', 'Medical Certificate', 'Psychological Assessment'],
            notes: 'Application materials complete, waiting for further arrangements',
          },
          {
            id: 'APP-002',
            type: 'Medical Clearance',
            status: 'pending',
            submittedDate: '2024-01-18',
            lastUpdated: '2024-01-22',
            description: 'Medical Clearance Application - Under review',
            nextStep: 'Wait for medical examination results',
            documents: ['Physical Exam Report', 'Blood Test', 'Psychological Assessment'],
            notes: 'Latest physical examination report needs to be submitted',
          },
          {
            id: 'APP-003',
            type: 'Legal Documentation',
            status: 'rejected',
            submittedDate: '2024-01-10',
            lastUpdated: '2024-01-12',
            description: 'Legal Documentation Application - Rejected',
            nextStep: 'Resubmit application',
            documents: ['Legal Statement', 'Contract Documents'],
            notes: 'File format does not meet requirements, please re-prepare',
          },
          {
            id: 'APP-004',
            type: 'Surrogate Application',
            status: 'completed',
            submittedDate: '2023-12-01',
            lastUpdated: '2024-01-05',
            description: 'Surrogacy Application - Completed',
            nextStep: 'Project completed',
            documents: ['Completion Certificate', 'Final Report'],
            notes: 'Successfully completed surrogacy project, all documents archived',
          },
        ];
        
        setApplications(mockApplications);
        // Save mock data for first time
        await AsyncStorageLib.setItem('user_applications', JSON.stringify(mockApplications));
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      // Fallback to empty array on error
      setApplications([]);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Application History</Text>
        <Text style={styles.subtitle}>View all your application records</Text>
      </View>

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
});
