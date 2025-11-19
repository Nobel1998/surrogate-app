import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, AppState } from 'react-native';
import RealNotificationService from '../services/RealNotificationService';

export default function BackgroundNotificationTestScreen() {
  const [permissions, setPermissions] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [appState, setAppState] = useState(AppState.currentState);
  const [badgeCount, setBadgeCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    checkPermissions();
    loadNotifications();
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
      addTestResult(`App状态变化: ${nextAppState}`, 'info');
    });

    return () => subscription?.remove();
  }, []);

  const checkPermissions = async () => {
    try {
      const perms = await RealNotificationService.checkNotificationPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const perms = await RealNotificationService.requestPermissions();
      setPermissions(perms);
      addTestResult('✅ 权限请求成功', 'success');
    } catch (error) {
      addTestResult('❌ 权限请求失败', 'error');
    }
  };

  const addTestResult = (message, type = 'info') => {
    const result = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    setTestResults(prev => [result, ...prev.slice(0, 9)]);
  };

  const loadNotifications = async () => {
    try {
      const allNotifications = RealNotificationService.getAllNotifications();
      setNotifications(allNotifications);
      const unreadCount = RealNotificationService.getUnreadCount();
      setBadgeCount(unreadCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Test 1: Basic notification
  const testBasicNotification = () => {
    try {
      RealNotificationService.sendLocalNotification(
        '基本通知测试',
        '这是一个基本的通知测试',
        { type: 'basic_test' }
      );
      addTestResult('✅ 基本通知已发送', 'success');
      loadNotifications();
    } catch (error) {
      addTestResult('❌ 基本通知发送失败', 'error');
    }
  };

  // Test 2: Background notification simulation
  const testBackgroundNotification = () => {
    try {
      RealNotificationService.testBackgroundNotification();
      addTestResult('✅ 后台通知测试已发送', 'success');
      loadNotifications();
      
      // 2秒后自动重置为前台状态
      setTimeout(() => {
        setAppState('active');
        RealNotificationService.simulateAppForeground();
        addTestResult('🔄 自动重置为前台状态', 'info');
      }, 2000);
    } catch (error) {
      addTestResult('❌ 后台通知测试失败', 'error');
    }
  };

  // Test 2.5: Enhanced background notification
  const testEnhancedBackgroundNotification = () => {
    try {
      RealNotificationService.simulateAppBackground();
      setAppState('background'); // 更新本地状态
      RealNotificationService.showEnhancedBackgroundNotification(
        '增强后台通知测试',
        '这是一个增强版的后台通知，具有更明显的视觉效果和详细信息',
        { type: 'enhanced_test', priority: 'high' }
      );
      addTestResult('✅ 增强后台通知测试已发送', 'success');
      loadNotifications();
      
      // 3秒后自动重置为前台状态
      setTimeout(() => {
        setAppState('active');
        RealNotificationService.simulateAppForeground();
        addTestResult('🔄 自动重置为前台状态', 'info');
      }, 3000);
    } catch (error) {
      addTestResult('❌ 增强后台通知测试失败', 'error');
    }
  };

  // Test 3: Status update notification
  const testStatusNotification = () => {
    const statuses = ['submitted', 'approved', 'rejected', 'matched', 'pregnant'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    try {
      RealNotificationService.sendStatusUpdateNotification(randomStatus, 'TEST-001');
      addTestResult(`✅ 状态更新通知已发送: ${randomStatus}`, 'success');
      loadNotifications();
    } catch (error) {
      addTestResult('❌ 状态更新通知发送失败', 'error');
    }
  };

  // Test 4: Event reminder
  const testEventReminder = () => {
    const events = [
      { title: '代孕信息会议', date: '2024年3月15日', time: '下午2:00' },
      { title: '医疗检查', date: '2024年3月18日', time: '上午10:00' },
    ];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    
    try {
      RealNotificationService.sendEventReminderNotification(
        randomEvent.title, 
        randomEvent.date, 
        randomEvent.time
      );
      addTestResult(`✅ 活动提醒已发送: ${randomEvent.title}`, 'success');
      loadNotifications();
    } catch (error) {
      addTestResult('❌ 活动提醒发送失败', 'error');
    }
  };

  // Test 5: Important message
  const testImportantMessage = () => {
    try {
      RealNotificationService.sendImportantMessageNotification(
        '紧急通知',
        '请立即查看您的申请状态更新',
        'high'
      );
      addTestResult('✅ 重要消息已发送', 'success');
      loadNotifications();
    } catch (error) {
      addTestResult('❌ 重要消息发送失败', 'error');
    }
  };

  // Test 6: Payment reminder
  const testPaymentReminder = () => {
    try {
      RealNotificationService.sendPaymentReminder('1000', '2024年3月20日');
      addTestResult('✅ 付款提醒已发送', 'success');
      loadNotifications();
    } catch (error) {
      addTestResult('❌ 付款提醒发送失败', 'error');
    }
  };

  // Test 7: Medical appointment
  const testMedicalAppointment = () => {
    try {
      RealNotificationService.sendMedicalAppointmentReminder(
        '产前检查',
        '2024年3月18日',
        '上午10:00'
      );
      addTestResult('✅ 医疗预约提醒已发送', 'success');
      loadNotifications();
    } catch (error) {
      addTestResult('❌ 医疗预约提醒发送失败', 'error');
    }
  };

  // Test 8: Scheduled notification
  const testScheduledNotification = () => {
    try {
      RealNotificationService.scheduleNotification(
        '定时通知',
        '这是一个5秒后发送的定时通知',
        5000
      );
      addTestResult('✅ 定时通知已安排 (5秒后)', 'success');
    } catch (error) {
      addTestResult('❌ 定时通知安排失败', 'error');
    }
  };

  // Test 9: Badge count
  const testBadgeCount = async () => {
    try {
      const newCount = Math.floor(Math.random() * 10) + 1;
      const actualCount = RealNotificationService.setBadgeCount(newCount);
      setBadgeCount(actualCount);
      addTestResult(`✅ 徽章计数已设置为: ${actualCount}`, 'success');
    } catch (error) {
      addTestResult('❌ 徽章计数设置失败', 'error');
    }
  };

  // Test 10: Clear all
  const testClearAll = () => {
    try {
      RealNotificationService.cancelAllNotifications();
      setBadgeCount(0);
      setNotifications([]);
      addTestResult('✅ 所有通知已清除', 'success');
    } catch (error) {
      addTestResult('❌ 清除通知失败', 'error');
    }
  };

  // Test 11: Simulate app background
  const simulateAppBackground = () => {
    RealNotificationService.simulateAppBackground();
    setAppState('background'); // 更新本地状态
    addTestResult('📱 模拟应用进入后台', 'info');
  };

  // Test 12: Simulate app foreground
  const simulateAppForeground = () => {
    RealNotificationService.simulateAppForeground();
    setAppState('active'); // 更新本地状态
    addTestResult('📱 模拟应用回到前台', 'info');
  };

  const getResultColor = (type) => {
    switch (type) {
      case 'success': return '#28A745';
      case 'error': return '#DC3545';
      case 'warning': return '#FFC107';
      case 'info': return '#17A2B8';
      default: return '#6C757D';
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔔 后台通知测试</Text>
      <Text style={styles.subtitle}>测试用户不在app界面时的推送通知</Text>

      {/* App State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 应用状态</Text>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { 
            color: appState === 'active' ? '#28A745' : '#DC3545',
            fontWeight: 'bold'
          }]}>
            当前状态: {appState === 'active' ? '🟢 前台' : '🔴 后台'}
          </Text>
          <Text style={styles.statusText}>
            徽章计数: {badgeCount}
          </Text>
          <Text style={styles.statusText}>
            通知数量: {notifications.length}
          </Text>
          <Text style={[styles.statusText, { fontSize: 12, color: '#666' }]}>
            模拟状态: {appState === 'active' ? '前台模式' : '后台模式'}
          </Text>
        </View>
      </View>

      {/* Permission Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 权限状态</Text>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            通知权限: {permissions?.alert ? '✅ 已授权' : '❌ 未授权'}
          </Text>
          {!permissions?.alert && (
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
              <Text style={styles.permissionButtonText}>请求权限</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Background Simulation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 应用状态模拟</Text>
        <View style={styles.simulationButtons}>
          <TouchableOpacity style={styles.simulationButton} onPress={simulateAppBackground}>
            <Text style={styles.simulationButtonText}>模拟进入后台</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.simulationButton} onPress={simulateAppForeground}>
            <Text style={styles.simulationButtonText}>模拟回到前台</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 通知测试</Text>
        
        <View style={styles.testGrid}>
          <TouchableOpacity style={styles.testButton} onPress={testBasicNotification}>
            <Text style={styles.testButtonText}>基本通知</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testBackgroundNotification}>
            <Text style={styles.testButtonText}>后台通知</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.testButton, styles.enhancedButton]} onPress={testEnhancedBackgroundNotification}>
            <Text style={styles.testButtonText}>增强后台通知</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testStatusNotification}>
            <Text style={styles.testButtonText}>状态更新</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testEventReminder}>
            <Text style={styles.testButtonText}>活动提醒</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testImportantMessage}>
            <Text style={styles.testButtonText}>重要消息</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testPaymentReminder}>
            <Text style={styles.testButtonText}>付款提醒</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testMedicalAppointment}>
            <Text style={styles.testButtonText}>医疗预约</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testScheduledNotification}>
            <Text style={styles.testButtonText}>定时通知</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* System Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ 系统测试</Text>
        
        <View style={styles.systemTests}>
          <TouchableOpacity style={styles.systemButton} onPress={testBadgeCount}>
            <Text style={styles.systemButtonText}>测试徽章计数</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.systemButton, styles.clearButton]} onPress={testClearAll}>
            <Text style={[styles.systemButtonText, styles.clearButtonText]}>清除所有通知</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>📊 测试结果</Text>
          <TouchableOpacity onPress={clearTestResults}>
            <Text style={styles.clearResultsText}>清除结果</Text>
          </TouchableOpacity>
        </View>
        
        {testResults.length === 0 ? (
          <Text style={styles.noResultsText}>暂无测试结果</Text>
        ) : (
          <View style={styles.resultsList}>
            {testResults.map((result) => (
              <View key={result.id} style={styles.resultItem}>
                <Text style={[styles.resultText, { color: getResultColor(result.type) }]}>
                  {result.message}
                </Text>
                <Text style={styles.resultTime}>{result.timestamp}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 测试说明</Text>
        <Text style={styles.instructionText}>
          • 点击"模拟进入后台"然后发送通知，测试后台弹窗效果{'\n'}
          • 使用"后台通知"按钮测试标准后台通知{'\n'}
          • 使用"增强后台通知"按钮测试更明显的后台通知效果{'\n'}
          • 观察应用状态变化和徽章计数更新{'\n'}
          • 测试定时通知功能（5秒后自动发送）{'\n'}
          • 检查通知点击交互和导航功能{'\n'}
          • 对比前台和后台通知的视觉差异
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
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  permissionContainer: {
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
  simulationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  simulationButton: {
    flex: 1,
    backgroundColor: '#17A2B8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  simulationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  testGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  testButton: {
    backgroundColor: '#28A745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  enhancedButton: {
    backgroundColor: '#DC3545',
  },
  systemTests: {
    flexDirection: 'row',
    gap: 12,
  },
  systemButton: {
    flex: 1,
    backgroundColor: '#2A7BF6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  systemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#DC3545',
  },
  clearButtonText: {
    color: '#fff',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearResultsText: {
    color: '#2A7BF6',
    fontSize: 14,
    fontWeight: '600',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultText: {
    fontSize: 14,
    flex: 1,
  },
  resultTime: {
    fontSize: 12,
    color: '#999',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
