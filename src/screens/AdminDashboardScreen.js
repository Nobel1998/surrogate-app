import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView, StatusBar, ScrollView, Platform } from 'react-native';
import AsyncStorageLib from '../utils/Storage';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardScreen({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const storedApps = await AsyncStorageLib.getItem('user_applications');
      if (storedApps) {
        setApplications(JSON.parse(storedApps));
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appId, newStatus) => {
    try {
      const updatedApps = applications.map(app => 
        app.id === appId ? { ...app, status: newStatus, lastUpdated: new Date().toISOString().split('T')[0] } : app
      );
      
      setApplications(updatedApps);
      await AsyncStorageLib.setItem('user_applications', JSON.stringify(updatedApps));
      
      Alert.alert('Success', `Application ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating application:', error);
      Alert.alert('Error', 'Failed to update application status');
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, { flex: 2 }]}>Applicant</Text>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>Date</Text>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>Status</Text>
      <Text style={[styles.headerCell, { flex: 2 }]}>Actions</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={[styles.cell, { flex: 2 }]}>
        <Text style={styles.applicantName}>{item.data?.fullName || 'Unknown'}</Text>
        <Text style={styles.applicantId}>{item.id}</Text>
      </View>
      
      <View style={[styles.cell, { flex: 1.5 }]}>
        <Text style={styles.cellText}>{item.submittedDate}</Text>
      </View>
      
      <View style={[styles.cell, { flex: 1.5 }]}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={[styles.cell, { flex: 2, flexDirection: 'row', gap: 8 }]}>
        {item.status === 'pending' ? (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleStatusUpdate(item.id, 'approved')}
            >
              <Text style={styles.actionButtonText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleStatusUpdate(item.id, 'rejected')}
            >
              <Text style={styles.actionButtonText}>✕</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.actionTakenText}>
            {item.status === 'approved' ? 'Approved' : 'Rejected'}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={loadApplications} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading applications...</Text>
        ) : applications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No applications found</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {renderHeader()}
            <FlatList
              data={applications}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
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
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#2A7BF6',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#2A7BF6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontWeight: '600',
    color: '#666',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  cell: {
    justifyContent: 'center',
  },
  applicantName: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  applicantId: {
    fontSize: 10,
    color: '#999',
  },
  cellText: {
    fontSize: 13,
    color: '#555',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#d4edda',
  },
  rejectButton: {
    backgroundColor: '#f8d7da',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionTakenText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
});

