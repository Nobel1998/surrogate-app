import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NotificationService from '../services/RealNotificationService';
import { supabase } from '../lib/supabase';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const mapRemoteNotification = (row) => ({
  id: String(row.id),
  type: row.type || 'status_update',
  title: row.title,
  message: row.message,
  data: row.data || {},
  timestamp: row.created_at,
  read: !!row.read,
  remote: true,
});

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
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const mergeRemoteRows = useCallback((rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    setNotifications((prev) => {
      const byId = new Map(prev.map((n) => [String(n.id), n]));
      rows.forEach((row) => {
        const mapped = mapRemoteNotification(row);
        byId.set(mapped.id, mapped);
      });
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setUnreadCount(merged.filter((n) => !n.read).length);
      return merged;
    });
  }, []);

  const loadRemoteNotifications = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Table may not exist yet — fail soft
        console.warn('[notifications] load remote failed:', error.message);
        return;
      }
      mergeRemoteRows(data || []);
    } catch (err) {
      console.warn('[notifications] load remote error:', err);
    }
  }, [mergeRemoteRows]);

  useEffect(() => {
    let channel;
    let mounted = true;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      if (!mounted) return;
      setCurrentUserId(userId);
      if (!userId) return;

      await loadRemoteNotifications(userId);

      channel = supabase
        .channel(`app-notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'app_notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!payload.new) return;
            const mapped = mapRemoteNotification(payload.new);
            setNotifications((prev) => {
              if (prev.some((n) => String(n.id) === mapped.id)) return prev;
              return [mapped, ...prev];
            });
            setUnreadCount((c) => c + 1);
            if (settings.statusUpdates !== false) {
              NotificationService.sendLocalNotification(
                mapped.title,
                mapped.message,
                { ...mapped.data, type: mapped.type, screen: 'ViewApplication' }
              );
            }
          }
        )
        .subscribe();
    };

    setup();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);
      if (userId) {
        loadRemoteNotifications(userId);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      authSub?.subscription?.unsubscribe?.();
    };
  }, [loadRemoteNotifications, settings.statusUpdates]);

  const initializeNotifications = async () => {
    try {
      const perms = await NotificationService.checkNotificationPermissions();
      setPermissions(perms);

      if (!perms.alert) {
        await NotificationService.requestPermissions();
      }

      loadNotificationSettings();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const loadNotificationSettings = () => {
    // In a real app, this would load from AsyncStorage or similar
  };

  const saveNotificationSettings = (newSettings) => {
    setSettings(newSettings);
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
    
    NotificationService.setBadgeCount(unreadCount + 1);
  };

  const markAsRead = async (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    const target = notifications.find((n) => String(n.id) === String(notificationId));
    if (target?.remote && currentUserId) {
      try {
        await supabase
          .from('app_notifications')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('user_id', currentUserId);
      } catch (err) {
        console.warn('[notifications] mark remote read failed:', err);
      }
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
    NotificationService.clearBadgeCount();

    if (currentUserId) {
      try {
        await supabase
          .from('app_notifications')
          .update({ read: true })
          .eq('user_id', currentUserId)
          .eq('read', false);
      } catch (err) {
        console.warn('[notifications] mark all remote read failed:', err);
      }
    }
  };

  const deleteNotification = async (notificationId) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );

    if (notification?.remote && currentUserId) {
      try {
        await supabase
          .from('app_notifications')
          .delete()
          .eq('id', notificationId)
          .eq('user_id', currentUserId);
      } catch (err) {
        console.warn('[notifications] delete remote failed:', err);
      }
    }
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
      data: { status, applicationId, screen: 'ViewApplication' },
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

  const scheduleMedicalAppointmentReminders = async (appointmentInfo) => {
    if (!settings.medicalAppointments) return { scheduledCount: 0, disabled: true };
    return NotificationService.scheduleAppointmentReminders(appointmentInfo);
  };

  const cancelMedicalAppointmentReminders = async (appointmentKey) => {
    return NotificationService.cancelAppointmentReminders(appointmentKey);
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
    scheduleMedicalAppointmentReminders,
    cancelMedicalAppointmentReminders,
    sendWeeklyUpdate,
    sendMarketingMessage,
    sendSurrogateProgressUpdate,
    refreshRemoteNotifications: () => loadRemoteNotifications(currentUserId),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
