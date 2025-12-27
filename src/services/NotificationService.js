import { Platform, Alert, Linking } from 'react-native';

class NotificationService {
  constructor() {
    this.configure();
  }

  configure() {
    // Mock configuration for development
    console.log('NotificationService configured for development');
  }

  // Request notification permissions
  requestPermissions() {
    return new Promise((resolve, reject) => {
      // Mock permission request
      const mockPermissions = {
        alert: true,
        badge: true,
        sound: true,
      };
      console.log('Mock notification permissions granted');
      resolve(mockPermissions);
    });
  }

  // Send local notification
  sendLocalNotification(title, message, data = {}) {
    // Mock notification - show alert instead
    Alert.alert(
      title,
      message,
      [
        { text: 'OK', onPress: () => console.log('Notification tapped:', data) }
      ]
    );
    console.log('Mock notification sent:', { title, message, data });
  }

  // Send application status update notification
  sendStatusUpdateNotification(status, applicationId) {
    const statusMessages = {
      'submitted': 'Your application has been submitted and is under review.',
      'approved': 'Great news! Your application has been approved.',
      'rejected': 'Your application status has been updated.',
      'interview_scheduled': 'An interview has been scheduled for your application.',
      'medical_clearance': 'Medical clearance is required for your application.',
      'legal_clearance': 'Legal clearance is required for your application.',
      'matched': 'Congratulations! You have been matched with intended parents.',
      'pregnant': 'Congratulations! Pregnancy has been confirmed.',
      'delivered': 'Congratulations! The baby has been delivered successfully.',
    };

    const message = statusMessages[status] || 'Your application status has been updated.';
    
    this.sendLocalNotification(
      'Application Status Update',
      message,
      {
        type: 'status_update',
        applicationId: applicationId,
        status: status,
      }
    );
  }

  // Send event reminder notification
  sendEventReminderNotification(eventTitle, eventDate, eventTime) {
    const message = `Reminder: ${eventTitle} is scheduled for ${eventDate} at ${eventTime}`;
    
    this.sendLocalNotification(
      'Event Reminder',
      message,
      {
        type: 'event_reminder',
        eventTitle: eventTitle,
        eventDate: eventDate,
        eventTime: eventTime,
      }
    );
  }

  // Send important message notification
  sendImportantMessageNotification(title, message, priority = 'normal') {
    this.sendLocalNotification(
      `Important: ${title}`,
      message,
      {
        type: 'important_message',
        priority: priority,
        timestamp: new Date().toISOString(),
      }
    );
  }

  // Schedule recurring notifications
  scheduleRecurringNotification(title, message, interval) {
    // Mock scheduling
    console.log('Mock scheduled notification:', { title, message, interval });
  }

  // Cancel all notifications
  cancelAllNotifications() {
    console.log('Mock: All notifications cancelled');
  }

  // Cancel specific notification
  cancelNotification(id) {
    console.log('Mock: Notification cancelled:', id);
  }

  // Get badge count
  getBadgeCount() {
    return new Promise((resolve) => {
      // Mock badge count
      resolve(0);
    });
  }

  // Set badge count
  setBadgeCount(count) {
    console.log('Mock: Badge count set to:', count);
  }

  // Clear badge count
  clearBadgeCount() {
    console.log('Mock: Badge count cleared');
  }

  // Check if notifications are enabled
  checkNotificationPermissions() {
    return new Promise((resolve) => {
      // Mock permissions check
      const mockPermissions = {
        alert: true,
        badge: true,
        sound: true,
      };
      resolve(mockPermissions);
    });
  }

  // Send welcome notification
  sendWelcomeNotification() {
    this.sendLocalNotification(
      'Welcome to Surrogacy App!',
      'Thank you for joining our community. We\'re here to support you throughout your journey.',
      {
        type: 'welcome',
        timestamp: new Date().toISOString(),
      }
    );
  }

  // Send payment reminder
  sendPaymentReminder(amount, dueDate) {
    this.sendLocalNotification(
      'Payment Reminder',
      `Payment of $${amount} is due on ${dueDate}`,
      {
        type: 'payment_reminder',
        amount: amount,
        dueDate: dueDate,
      }
    );
  }

  // Send medical appointment reminder
  sendMedicalAppointmentReminder(appointmentType, date, time) {
    this.sendLocalNotification(
      'Medical Appointment Reminder',
      `You have a ${appointmentType} appointment on ${date} at ${time}`,
      {
        type: 'medical_appointment',
        appointmentType: appointmentType,
        date: date,
        time: time,
      }
    );
  }

  // Send surrogate progress stage update notification
  sendSurrogateProgressUpdate(surrogateName, oldStage, newStage, stageLabels) {
    const oldStageLabel = stageLabels[oldStage] || oldStage;
    const newStageLabel = stageLabels[newStage] || newStage;
    
    const message = `${surrogateName || 'Your surrogate'} has progressed from ${oldStageLabel} to ${newStageLabel}`;
    
    this.sendLocalNotification(
      'Surrogate Progress Update',
      message,
      {
        type: 'surrogate_progress_update',
        surrogateName: surrogateName,
        oldStage: oldStage,
        newStage: newStage,
        oldStageLabel: oldStageLabel,
        newStageLabel: newStageLabel,
        timestamp: new Date().toISOString(),
      }
    );
  }
}

export default new NotificationService();