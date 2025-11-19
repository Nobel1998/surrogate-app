import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import NotificationService from '../services/NotificationService';

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState({
    statusUpdates: true,
    eventReminders: true,
    importantMessages: true,
    paymentReminders: true,
    medicalAppointments: true,
    weeklyUpdates: false,
    marketingMessages: false,
  });

  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const perms = await NotificationService.checkNotificationPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const perms = await NotificationService.requestPermissions();
      setPermissions(perms);
      if (perms.alert && perms.badge && perms.sound) {
        Alert.alert('Success', 'Notification permissions granted!');
      } else {
        Alert.alert('Permissions Required', 'Please enable notifications in your device settings.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request notification permissions.');
    }
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const testNotification = (type) => {
    switch (type) {
      case 'status':
        NotificationService.sendStatusUpdateNotification('approved', 'APP-001');
        break;
      case 'event':
        NotificationService.sendEventReminderNotification(
          'Surrogacy Information Session',
          'March 15, 2024',
          '2:00 PM'
        );
        break;
      case 'important':
        NotificationService.sendImportantMessageNotification(
          'Important Update',
          'Please check your application status for the latest updates.'
        );
        break;
      case 'payment':
        NotificationService.sendPaymentReminder('500', 'March 20, 2024');
        break;
      case 'medical':
        NotificationService.sendMedicalAppointmentReminder(
          'Prenatal Checkup',
          'March 18, 2024',
          '10:00 AM'
        );
        break;
      default:
        break;
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            NotificationService.cancelAllNotifications();
            NotificationService.clearBadgeCount();
            Alert.alert('Success', 'All notifications have been cleared.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔔 Notification Settings</Text>
      <Text style={styles.subtitle}>Manage your notification preferences</Text>

      {/* Permission Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Notification Permissions</Text>
        {permissions ? (
          <View style={styles.permissionStatus}>
            <Text style={styles.permissionText}>
              Status: {permissions.alert ? '✅ Enabled' : '❌ Disabled'}
            </Text>
            {!permissions.alert && (
              <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
                <Text style={styles.permissionButtonText}>Enable Notifications</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Request Permissions</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Notification Types</Text>
        
        <View style={styles.notificationItem}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Application Status Updates</Text>
            <Text style={styles.notificationDescription}>
              Get notified when your application status changes
            </Text>
          </View>
          <Switch
            value={notifications.statusUpdates}
            onValueChange={() => toggleNotification('statusUpdates')}
            trackColor={{ false: '#767577', true: '#2A7BF6' }}
            thumbColor={notifications.statusUpdates ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Event Reminders</Text>
            <Text style={styles.notificationDescription}>
              Reminders for upcoming events and appointments
            </Text>
          </View>
          <Switch
            value={notifications.eventReminders}
            onValueChange={() => toggleNotification('eventReminders')}
            trackColor={{ false: '#767577', true: '#2A7BF6' }}
            thumbColor={notifications.eventReminders ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Important Messages</Text>
            <Text style={styles.notificationDescription}>
              Critical updates and important announcements
            </Text>
          </View>
          <Switch
            value={notifications.importantMessages}
            onValueChange={() => toggleNotification('importantMessages')}
            trackColor={{ false: '#767577', true: '#2A7BF6' }}
            thumbColor={notifications.importantMessages ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Payment Reminders</Text>
            <Text style={styles.notificationDescription}>
              Notifications for payment due dates
            </Text>
          </View>
          <Switch
            value={notifications.paymentReminders}
            onValueChange={() => toggleNotification('paymentReminders')}
            trackColor={{ false: '#767577', true: '#2A7BF6' }}
            thumbColor={notifications.paymentReminders ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Medical Appointments</Text>
            <Text style={styles.notificationDescription}>
              Reminders for medical appointments and checkups
            </Text>
          </View>
          <Switch
            value={notifications.medicalAppointments}
            onValueChange={() => toggleNotification('medicalAppointments')}
            trackColor={{ false: '#767577', true: '#2A7BF6' }}
            thumbColor={notifications.medicalAppointments ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Weekly Updates</Text>
            <Text style={styles.notificationDescription}>
              Weekly summary of your surrogacy journey
            </Text>
          </View>
          <Switch
            value={notifications.weeklyUpdates}
            onValueChange={() => toggleNotification('weeklyUpdates')}
            trackColor={{ false: '#767577', true: '#2A7BF6' }}
            thumbColor={notifications.weeklyUpdates ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Marketing Messages</Text>
            <Text style={styles.notificationDescription}>
              Promotional offers and general updates
            </Text>
          </View>
          <Switch
            value={notifications.marketingMessages}
            onValueChange={() => toggleNotification('marketingMessages')}
            trackColor={{ false: '#767577', true: '#2A7BF6' }}
            thumbColor={notifications.marketingMessages ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Test Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Notifications</Text>
        <Text style={styles.testDescription}>
          Test different types of notifications to see how they appear
        </Text>
        
        <View style={styles.testButtons}>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testNotification('status')}
          >
            <Text style={styles.testButtonText}>Test Status Update</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testNotification('event')}
          >
            <Text style={styles.testButtonText}>Test Event Reminder</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testNotification('important')}
          >
            <Text style={styles.testButtonText}>Test Important Message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testNotification('payment')}
          >
            <Text style={styles.testButtonText}>Test Payment Reminder</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testNotification('medical')}
          >
            <Text style={styles.testButtonText}>Test Medical Appointment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗑️ Notification Management</Text>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearAllNotifications}>
          <Text style={styles.clearButtonText}>Clear All Notifications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={() => NotificationService.clearBadgeCount()}
        >
          <Text style={styles.clearButtonText}>Clear Badge Count</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About Notifications</Text>
        <Text style={styles.infoText}>
          • Notifications help you stay updated on your surrogacy journey{'\n'}
          • You can customize which types of notifications you receive{'\n'}
          • Important messages will always be delivered regardless of settings{'\n'}
          • You can disable notifications at any time in your device settings
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
    color: '#2A7BF6',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A7BF6',
    marginBottom: 16,
  },
  permissionStatus: {
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#2A7BF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notificationContent: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  testDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testButton: {
    backgroundColor: '#28A745',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
