import React, { createContext, useContext, useState, useEffect } from 'react';
import NotificationService from '../services/RealNotificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissions, setPermissions] = useState(null);
  const [settings, setSettings] = useState({
    statusUpdates: true,
    eventReminders: true,
    importantMessages: true,
    paymentReminders: true,
    medicalAppointments: true,
    weeklyUpdates: false,
    marketingMessages: false,
  });

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      // Check notification permissions
      const perms = await NotificationService.checkNotificationPermissions();
      setPermissions(perms);

      // Request permissions if not granted
      if (!perms.alert) {
        await NotificationService.requestPermissions();
      }

      // Load notification settings from storage
      loadNotificationSettings();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const loadNotificationSettings = () => {
    // In a real app, this would load from AsyncStorage or similar
    // For now, we'll use the default settings
  };

  const saveNotificationSettings = (newSettings) => {
    setSettings(newSettings);
    // In a real app, this would save to AsyncStorage
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Update badge count
    NotificationService.setBadgeCount(unreadCount + 1);
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
    NotificationService.clearBadgeCount();
  };

  const deleteNotification = (notificationId) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    NotificationService.cancelAllNotifications();
    NotificationService.clearBadgeCount();
  };

  // Notification sending methods
  const sendStatusUpdate = (status, applicationId) => {
    if (!settings.statusUpdates) return;
    
    const notification = {
      type: 'status_update',
      title: 'Application Status Update',
      message: getStatusMessage(status),
      data: { status, applicationId },
    };
    
    addNotification(notification);
    NotificationService.sendStatusUpdateNotification(status, applicationId);
  };

  const sendEventReminder = (eventTitle, eventDate, eventTime) => {
    if (!settings.eventReminders) return;
    
    const notification = {
      type: 'event_reminder',
      title: 'Event Reminder',
      message: `Reminder: ${eventTitle} is scheduled for ${eventDate} at ${eventTime}`,
      data: { eventTitle, eventDate, eventTime },
    };
    
    addNotification(notification);
    NotificationService.sendEventReminderNotification(eventTitle, eventDate, eventTime);
  };

  const sendImportantMessage = (title, message, priority = 'normal') => {
    // Important messages are always sent regardless of settings
    const notification = {
      type: 'important_message',
      title: `Important: ${title}`,
      message,
      priority,
      data: { priority, timestamp: new Date().toISOString() },
    };
    
    addNotification(notification);
    NotificationService.sendImportantMessageNotification(title, message, priority);
  };

  const sendPaymentReminder = (amount, dueDate) => {
    if (!settings.paymentReminders) return;
    
    const notification = {
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: `Payment of $${amount} is due on ${dueDate}`,
      data: { amount, dueDate },
    };
    
    addNotification(notification);
    NotificationService.sendPaymentReminder(amount, dueDate);
  };

  const sendMedicalAppointmentReminder = (appointmentType, date, time) => {
    if (!settings.medicalAppointments) return;
    
    const notification = {
      type: 'medical_appointment',
      title: 'Medical Appointment Reminder',
      message: `You have a ${appointmentType} appointment on ${date} at ${time}`,
      data: { appointmentType, date, time },
    };
    
    addNotification(notification);
    NotificationService.sendMedicalAppointmentReminder(appointmentType, date, time);
  };

  const sendWeeklyUpdate = () => {
    if (!settings.weeklyUpdates) return;
    
    const notification = {
      type: 'weekly_update',
      title: 'Weekly Update',
      message: 'Your weekly surrogacy journey summary is ready.',
      data: { timestamp: new Date().toISOString() },
    };
    
    addNotification(notification);
    NotificationService.sendLocalNotification(
      'Weekly Update',
      'Your weekly surrogacy journey summary is ready.',
      { type: 'weekly_update' }
    );
  };

  const sendMarketingMessage = (title, message) => {
    if (!settings.marketingMessages) return;
    
    const notification = {
      type: 'marketing',
      title,
      message,
      data: { timestamp: new Date().toISOString() },
    };
    
    addNotification(notification);
    NotificationService.sendLocalNotification(title, message, { type: 'marketing' });
  };

  const sendSurrogateProgressUpdate = (surrogateName, oldStage, newStage, stageLabels) => {
    // Progress updates are important, always send regardless of settings
    const oldStageLabel = stageLabels[oldStage] || oldStage;
    const newStageLabel = stageLabels[newStage] || newStage;
    
    const notification = {
      type: 'surrogate_progress_update',
      title: 'Surrogate Progress Update',
      message: `${surrogateName || 'Your surrogate'} has progressed from ${oldStageLabel} to ${newStageLabel}`,
      data: {
        surrogateName,
        oldStage,
        newStage,
        oldStageLabel,
        newStageLabel,
        timestamp: new Date().toISOString(),
      },
    };
    
    addNotification(notification);
    NotificationService.sendSurrogateProgressUpdate(surrogateName, oldStage, newStage, stageLabels);
  };

  const getStatusMessage = (status) => {
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
    
    return statusMessages[status] || 'Your application status has been updated.';
  };

  const value = {
    notifications,
    unreadCount,
    permissions,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    saveNotificationSettings,
    sendStatusUpdate,
    sendEventReminder,
    sendImportantMessage,
    sendPaymentReminder,
    sendMedicalAppointmentReminder,
    sendWeeklyUpdate,
    sendMarketingMessage,
    sendSurrogateProgressUpdate,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};