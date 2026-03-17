import { Platform, Alert, Linking, AppState } from 'react-native';
import AsyncStorageLib from '../utils/Storage';

const APPOINTMENT_REMINDER_STORAGE_KEY = 'appointment_reminder_schedule_v1';
const MAX_TIMER_DELAY_MS = 2147480000;

class RealNotificationService {
  constructor() {
    this.notifications = [];
    this.badgeCount = 0;
    this.isAppInForeground = true;
    this.language = 'en';
    this.appointmentReminderTimers = new Map();
    this.scheduledAppointmentReminders = {};
    this.setupAppStateListener();
    void this.refreshLanguage();
    this.restoreScheduledAppointmentReminders();
  }

  setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      this.isAppInForeground = nextAppState === 'active';
      if (nextAppState === 'active') {
        void this.refreshLanguage();
      }
      console.log('App state changed:', nextAppState);
    });
  }

  async refreshLanguage() {
    try {
      const savedLanguage = await AsyncStorageLib.getItem('app_language');
      this.language = savedLanguage || 'en';
    } catch (error) {
      console.error('Failed to load notification language:', error);
      this.language = 'en';
    }
  }

  isChineseLanguage() {
    return this.language === 'zh';
  }

  // Request notification permissions
  requestPermissions() {
    return new Promise((resolve, reject) => {
      // Mock permission request - in real app this would request actual permissions
      const mockPermissions = {
        alert: true,
        badge: true,
        sound: true,
      };
      console.log('Notification permissions granted');
      resolve(mockPermissions);
    });
  }

  // Send local notification with real system behavior
  sendLocalNotification(title, message, data = {}) {
    const notification = {
      id: Date.now().toString(),
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.notifications.unshift(notification);
    this.badgeCount = this.getUnreadCount();
    
    console.log('Notification sent:', notification);
    console.log('Badge count updated to:', this.badgeCount);

    // If app is in background, show system-style alert
    if (!this.isAppInForeground) {
      this.showBackgroundNotification(title, message, data);
    } else {
      // If app is in foreground, show alert
      Alert.alert(
        title,
        message,
        [
          { 
            text: this.isChineseLanguage() ? '查看' : 'View',
            onPress: () => this.handleNotificationTap(notification) 
          },
          { 
            text: this.isChineseLanguage() ? '稍后' : 'Later',
            style: 'cancel' 
          }
        ]
      );
    }
  }

  // Show background notification (simulates system notification)
  showBackgroundNotification(title, message, data) {
    // Create a more prominent alert for background notifications
    const notificationType = data?.type || 'general';
    const priority = data?.priority || 'normal';
    
    // Different icons and styles based on notification type
    let icon = '🔔';
    let backgroundColor = '#2A7BF6';
    let textColor = '#fff';
    
    switch (notificationType) {
      case 'status_update':
        icon = '📋';
        backgroundColor = '#28A745';
        break;
      case 'event_reminder':
        icon = '📅';
        backgroundColor = '#17A2B8';
        break;
      case 'important_message':
        icon = '⚠️';
        backgroundColor = '#DC3545';
        break;
      case 'payment_reminder':
        icon = '💳';
        backgroundColor = '#FFC107';
        textColor = '#000';
        break;
      case 'medical_appointment':
        icon = '🏥';
        backgroundColor = '#6F42C1';
        break;
      default:
        icon = '🔔';
        break;
    }
    
    // High priority notifications get special treatment
    if (priority === 'high') {
      icon = '🚨';
      backgroundColor = '#DC3545';
    }
    
    // Simulate vibration and sound
    this.simulateNotificationEffects(priority);
    
    // Create a more prominent alert for background notifications
    const backgroundNotice = this.isChineseLanguage() ? '后台通知' : 'Background Notification';
    const viewNowText = this.isChineseLanguage() ? '🔍 立即查看' : '🔍 View Now';
    const laterText = this.isChineseLanguage() ? '⏰ 稍后处理' : '⏰ Later';
    Alert.alert(
      `${icon} ${title}`,
      `📱 ${backgroundNotice}\n\n${message}\n\n⏰ ${new Date().toLocaleTimeString()}`,
      [
        { 
          text: viewNowText,
          onPress: () => this.handleNotificationTap({ title, message, data })
        },
        { 
          text: laterText,
          style: 'cancel' 
        }
      ],
      { 
        cancelable: false, // Make it more prominent
        userInterfaceStyle: 'light' // Force light theme for better visibility
      }
    );
  }

  // Handle notification tap
  handleNotificationTap(notification) {
    console.log('Notification tapped:', notification);
    
    // Handle different notification types
    switch (notification.data?.type) {
      case 'status_update':
        console.log('Navigate to application status screen');
        break;
      case 'event_reminder':
        console.log('Navigate to events screen');
        break;
      case 'important_message':
        console.log('Show message details');
        break;
      case 'payment_reminder':
        console.log('Navigate to payment screen');
        break;
      case 'medical_appointment':
        console.log('Navigate to medical appointments');
        break;
      default:
        console.log('Default notification action');
    }
  }

  // Send application status update notification
  sendStatusUpdateNotification(status, applicationId) {
    const statusMessages = {
      'submitted': '您的申请已提交，正在审核中。',
      'approved': '恭喜！您的申请已获得批准。',
      'rejected': '您的申请状态已更新。',
      'interview_scheduled': '已为您安排面试。',
      'medical_clearance': '需要医疗许可。',
      'legal_clearance': '需要法律许可。',
      'matched': '恭喜！您已与意向父母匹配。',
      'pregnant': '恭喜！怀孕已确认。',
      'delivered': '恭喜！宝宝已成功分娩。',
    };

    const message = statusMessages[status] || '您的申请状态已更新。';
    
    this.sendLocalNotification(
      '申请状态更新',
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
    const message = `提醒：${eventTitle} 定于 ${eventDate} ${eventTime} 举行`;
    
    this.sendLocalNotification(
      '活动提醒',
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
      `重要：${title}`,
      message,
      {
        type: 'important_message',
        priority: priority,
        timestamp: new Date().toISOString(),
      }
    );
  }

  // Send payment reminder
  sendPaymentReminder(amount, dueDate) {
    this.sendLocalNotification(
      '付款提醒',
      `付款金额 $${amount} 将于 ${dueDate} 到期`,
      {
        type: 'payment_reminder',
        amount: amount,
        dueDate: dueDate,
      }
    );
  }

  // Send medical appointment reminder
  sendMedicalAppointmentReminder(appointmentType, date, time) {
    const title = this.isChineseLanguage() ? '医疗预约提醒' : 'Medical Appointment Reminder';
    const message = this.isChineseLanguage()
      ? `您有一个 ${appointmentType} 预约，时间：${date} ${time}`
      : `You have a ${appointmentType} appointment on ${date} at ${time}`;

    this.sendLocalNotification(
      title,
      message,
      {
        type: 'medical_appointment',
        appointmentType: appointmentType,
        date: date,
        time: time,
      }
    );
  }

  getAppointmentReminderOffsets() {
    if (this.isChineseLanguage()) {
      return [
        { id: '24h', ms: 24 * 60 * 60 * 1000, label: '24小时后即将到达' },
        { id: '2h', ms: 2 * 60 * 60 * 1000, label: '2小时后即将到达' },
      ];
    }

    return [
      { id: '24h', ms: 24 * 60 * 60 * 1000, label: 'starts in 24 hours' },
      { id: '2h', ms: 2 * 60 * 60 * 1000, label: 'starts in 2 hours' },
    ];
  }

  getAppointmentDateTime(appointmentDate, appointmentTime) {
    if (!appointmentDate || !appointmentTime) return null;
    const dateStr = String(appointmentDate).slice(0, 10);
    const timeStr = String(appointmentTime).slice(0, 5);
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  async persistScheduledAppointmentReminders() {
    try {
      await AsyncStorageLib.setItem(
        APPOINTMENT_REMINDER_STORAGE_KEY,
        JSON.stringify(this.scheduledAppointmentReminders)
      );
    } catch (error) {
      console.error('Failed to persist appointment reminders:', error);
    }
  }

  scheduleReminderTimer(reminderId, triggerAt, onTrigger) {
    const tick = () => {
      if (!this.scheduledAppointmentReminders[reminderId]) return;

      const remaining = triggerAt - Date.now();
      if (remaining <= 0) {
        void onTrigger();
        return;
      }

      const delay = Math.min(remaining, MAX_TIMER_DELAY_MS);
      const timer = setTimeout(tick, delay);
      this.appointmentReminderTimers.set(reminderId, timer);
    };

    tick();
  }

  async scheduleAppointmentReminders({
    appointmentKey,
    appointmentType,
    appointmentDate,
    appointmentTime,
    providerName,
    clinicName,
  }) {
    if (!appointmentKey) return { scheduledCount: 0 };
    await this.refreshLanguage();

    await this.cancelAppointmentReminders(appointmentKey);

    const appointmentDateTime = this.getAppointmentDateTime(appointmentDate, appointmentTime);
    if (!appointmentDateTime) return { scheduledCount: 0 };

    const now = Date.now();
    const offsets = this.getAppointmentReminderOffsets();
    let scheduledCount = 0;

    offsets.forEach((offset) => {
      const triggerAt = appointmentDateTime.getTime() - offset.ms;
      if (triggerAt <= now) return;

      const reminderId = `${appointmentKey}:${offset.id}`;
      this.scheduledAppointmentReminders[reminderId] = {
        appointmentKey,
        appointmentType,
        appointmentDate,
        appointmentTime,
        providerName: providerName || null,
        clinicName: clinicName || null,
        reminderOffset: offset.id,
        triggerAt,
        createdAt: Date.now(),
      };
      this.scheduleReminderTimer(reminderId, triggerAt, async () => {
        const reminderTitle = this.isChineseLanguage() ? '医疗预约提醒' : 'Medical Appointment Reminder';
        const providerOrClinic = providerName || clinicName || (this.isChineseLanguage() ? '医疗机构' : 'provider');
        const reminderMessage = this.isChineseLanguage()
          ? `${appointmentType} 预约（${providerOrClinic}）${offset.label}：${appointmentDate} ${appointmentTime}`
          : `${appointmentType} appointment (${providerOrClinic}) ${offset.label}: ${appointmentDate} ${appointmentTime}`;
        this.sendLocalNotification(
          reminderTitle,
          reminderMessage,
          {
            type: 'medical_appointment',
            appointmentType,
            date: appointmentDate,
            time: appointmentTime,
            appointmentKey,
            reminderOffset: offset.id,
          }
        );

        this.appointmentReminderTimers.delete(reminderId);
        delete this.scheduledAppointmentReminders[reminderId];
        await this.persistScheduledAppointmentReminders();
      });

      scheduledCount += 1;
    });

    // If appointment is within 2 hours, keep at least one reminder at appointment time.
    if (scheduledCount === 0 && appointmentDateTime.getTime() > now) {
      const reminderId = `${appointmentKey}:at_time`;
      this.scheduledAppointmentReminders[reminderId] = {
        appointmentKey,
        appointmentType,
        appointmentDate,
        appointmentTime,
        providerName: providerName || null,
        clinicName: clinicName || null,
        reminderOffset: 'at_time',
        triggerAt: appointmentDateTime.getTime(),
        createdAt: Date.now(),
      };
      this.scheduleReminderTimer(reminderId, appointmentDateTime.getTime(), async () => {
        const reminderTitle = this.isChineseLanguage() ? '医疗预约提醒' : 'Medical Appointment Reminder';
        const reminderMessage = this.isChineseLanguage()
          ? `现在是您的 ${appointmentType} 预约时间：${appointmentDate} ${appointmentTime}`
          : `It is now time for your ${appointmentType} appointment: ${appointmentDate} ${appointmentTime}`;
        this.sendLocalNotification(
          reminderTitle,
          reminderMessage,
          {
            type: 'medical_appointment',
            appointmentType,
            date: appointmentDate,
            time: appointmentTime,
            appointmentKey,
            reminderOffset: 'at_time',
          }
        );

        this.appointmentReminderTimers.delete(reminderId);
        delete this.scheduledAppointmentReminders[reminderId];
        await this.persistScheduledAppointmentReminders();
      });

      scheduledCount = 1;
    }

    await this.persistScheduledAppointmentReminders();
    return { scheduledCount };
  }

  async cancelAppointmentReminders(appointmentKey) {
    if (!appointmentKey) return;

    Object.keys(this.scheduledAppointmentReminders).forEach((reminderId) => {
      if (!reminderId.startsWith(`${appointmentKey}:`)) return;
      const timer = this.appointmentReminderTimers.get(reminderId);
      if (timer) {
        clearTimeout(timer);
      }
      this.appointmentReminderTimers.delete(reminderId);
      delete this.scheduledAppointmentReminders[reminderId];
    });

    await this.persistScheduledAppointmentReminders();
  }

  async restoreScheduledAppointmentReminders() {
    try {
      await this.refreshLanguage();
      const raw = await AsyncStorageLib.getItem(APPOINTMENT_REMINDER_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      this.scheduledAppointmentReminders = parsed;

      const now = Date.now();
      Object.entries(parsed).forEach(([reminderId, reminder]) => {
        const triggerAt = Number(reminder?.triggerAt || 0);
        if (!triggerAt || triggerAt <= now) {
          delete this.scheduledAppointmentReminders[reminderId];
          return;
        }

        this.scheduleReminderTimer(reminderId, triggerAt, async () => {
          const reminderTitle = this.isChineseLanguage() ? '医疗预约提醒' : 'Medical Appointment Reminder';
          const reminderMessage = this.isChineseLanguage()
            ? `${reminder.appointmentType} 预约提醒：${reminder.appointmentDate} ${reminder.appointmentTime}`
            : `${reminder.appointmentType} appointment reminder: ${reminder.appointmentDate} ${reminder.appointmentTime}`;
          this.sendLocalNotification(
            reminderTitle,
            reminderMessage,
            {
              type: 'medical_appointment',
              appointmentType: reminder.appointmentType,
              date: reminder.appointmentDate,
              time: reminder.appointmentTime,
              appointmentKey: reminder.appointmentKey,
              reminderOffset: reminder.reminderOffset,
            }
          );
          this.appointmentReminderTimers.delete(reminderId);
          delete this.scheduledAppointmentReminders[reminderId];
          await this.persistScheduledAppointmentReminders();
        });
      });

      await this.persistScheduledAppointmentReminders();
    } catch (error) {
      console.error('Failed to restore appointment reminders:', error);
    }
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

  // Schedule notification for later
  scheduleNotification(title, message, delay = 5000) {
    setTimeout(() => {
      this.sendLocalNotification(title, message, {
        type: 'scheduled',
        scheduledTime: new Date().toISOString(),
      });
    }, delay);
  }

  // Cancel all notifications
  cancelAllNotifications() {
    this.notifications = [];
    this.badgeCount = 0;
    this.appointmentReminderTimers.forEach((timer) => clearTimeout(timer));
    this.appointmentReminderTimers.clear();
    this.scheduledAppointmentReminders = {};
    this.persistScheduledAppointmentReminders();
    console.log('All notifications cancelled');
    console.log('Badge count reset to:', this.badgeCount);
  }

  // Cancel specific notification
  cancelNotification(id) {
    const notification = this.notifications.find(n => n.id === id);
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.badgeCount = this.getUnreadCount();
    console.log('Notification cancelled:', id);
    console.log('Badge count updated to:', this.badgeCount);
  }

  // Get badge count
  getBadgeCount() {
    return new Promise((resolve) => {
      resolve(this.badgeCount);
    });
  }

  // Set badge count
  setBadgeCount(count) {
    this.badgeCount = Math.max(0, count);
    console.log('Badge count set to:', this.badgeCount);
    console.log('Total notifications:', this.notifications.length);
    console.log('Unread notifications:', this.getUnreadCount());
    return this.badgeCount;
  }

  // Clear badge count
  clearBadgeCount() {
    this.badgeCount = 0;
    console.log('Badge count cleared');
    console.log('Badge count reset to:', this.badgeCount);
  }

  // Check if notifications are enabled
  checkNotificationPermissions() {
    return new Promise((resolve) => {
      const mockPermissions = {
        alert: true,
        badge: true,
        sound: true,
      };
      resolve(mockPermissions);
    });
  }

  // Get all notifications
  getAllNotifications() {
    return this.notifications;
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.badgeCount = this.getUnreadCount();
      console.log('Notification marked as read:', notificationId);
      console.log('Badge count updated to:', this.badgeCount);
    }
  }

  // Get unread count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Test background notification
  testBackgroundNotification() {
    // This simulates a notification when app is in background
    this.isAppInForeground = false;
    this.sendLocalNotification(
      '后台测试通知',
      '这是一个测试后台通知，模拟用户不在app界面时的情况',
      { type: 'background_test' }
    );
    // Reset to foreground after 2 seconds
    setTimeout(() => {
      this.isAppInForeground = true;
    }, 2000);
  }

  // Simulate app going to background
  simulateAppBackground() {
    this.isAppInForeground = false;
    console.log('App simulated to background');
  }

  // Simulate app coming to foreground
  simulateAppForeground() {
    this.isAppInForeground = true;
    console.log('App simulated to foreground');
  }

  // Simulate notification effects (vibration, sound, etc.)
  simulateNotificationEffects(priority = 'normal') {
    console.log('🔊 模拟通知效果:', {
      priority,
      vibration: priority === 'high' ? '强烈振动' : '轻微振动',
      sound: priority === 'high' ? '紧急提示音' : '标准提示音',
      timestamp: new Date().toLocaleTimeString()
    });
    
    // Simulate different vibration patterns
    if (priority === 'high') {
      console.log('📳 强烈振动模式: 连续3次振动');
    } else {
      console.log('📳 标准振动模式: 单次振动');
    }
    
    // Simulate sound effects
    if (priority === 'high') {
      console.log('🔊 紧急提示音: 高音调连续提示');
    } else {
      console.log('🔊 标准提示音: 温和提示音');
    }
  }

  // Enhanced background notification with more visual distinction
  showEnhancedBackgroundNotification(title, message, data) {
    const notificationType = data?.type || 'general';
    const priority = data?.priority || 'normal';
    
    // Create a more visually distinct background notification
    const backgroundStyle = {
      backgroundColor: priority === 'high' ? '#DC3545' : '#2A7BF6',
      color: '#fff',
      padding: 20,
      borderRadius: 10,
      margin: 10
    };
    
    // Simulate notification effects
    this.simulateNotificationEffects(priority);
    
    // Show enhanced alert
    Alert.alert(
      `📱 后台推送通知`,
      `\n🔔 ${title}\n\n📝 ${message}\n\n⏰ 时间: ${new Date().toLocaleTimeString()}\n📊 类型: ${notificationType}\n⚡ 优先级: ${priority === 'high' ? '高' : '普通'}`,
      [
        { 
          text: '🔍 立即查看详情', 
          onPress: () => this.handleNotificationTap({ title, message, data })
        },
        { 
          text: '⏰ 稍后处理', 
          style: 'cancel' 
        }
      ],
      { 
        cancelable: false,
        userInterfaceStyle: 'light'
      }
    );
  }
}

export default new RealNotificationService();
