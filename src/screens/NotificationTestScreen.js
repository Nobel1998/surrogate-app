import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import NotificationService from '../services/RealNotificationService';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationTestScreen() {
  const { sendStatusUpdate, sendEventReminder, sendImportantMessage, sendPaymentReminder, sendMedicalAppointmentReminder } = useNotifications();
  const [permissions, setPermissions] = useState(null);
  const [testResults, setTestResults] = useState([]);

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
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  // Test 1: Basic Local Notification
  const testBasicNotification = () => {
    try {
      NotificationService.sendLocalNotification(
        '测试通知',
        '这是一个基本的本地通知测试',
        { type: 'test', timestamp: new Date().toISOString() }
      );
      addTestResult('✅ 基本通知已发送', 'success');
    } catch (error) {
      addTestResult('❌ 基本通知发送失败', 'error');
    }
  };

  // Test 2: Application Status Updates
  const testStatusNotifications = () => {
    const statuses = ['submitted', 'approved', 'rejected', 'interview_scheduled', 'matched', 'pregnant', 'delivered'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    try {
      sendStatusUpdate(randomStatus, 'TEST-APP-001');
      addTestResult(`✅ 状态更新通知已发送: ${randomStatus}`, 'success');
    } catch (error) {
      addTestResult('❌ 状态更新通知发送失败', 'error');
    }
  };

  // Test 3: Event Reminders
  const testEventReminders = () => {
    const events = [
      { title: '代孕信息会议', date: '2024年3月15日', time: '下午2:00' },
      { title: '医疗检查预约', date: '2024年3月18日', time: '上午10:00' },
      { title: '法律咨询会议', date: '2024年3月20日', time: '下午3:00' },
    ];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    
    try {
      sendEventReminder(randomEvent.title, randomEvent.date, randomEvent.time);
      addTestResult(`✅ 活动提醒已发送: ${randomEvent.title}`, 'success');
    } catch (error) {
      addTestResult('❌ 活动提醒发送失败', 'error');
    }
  };

  // Test 4: Important Messages
  const testImportantMessages = () => {
    const messages = [
      { title: '紧急通知', message: '请立即查看您的申请状态更新' },
      { title: '政策更新', message: '代孕政策有重要更新，请查看详情' },
      { title: '安全提醒', message: '请注意保护您的个人信息安全' },
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    try {
      sendImportantMessage(randomMessage.title, randomMessage.message, 'high');
      addTestResult(`✅ 重要消息已发送: ${randomMessage.title}`, 'success');
    } catch (error) {
      addTestResult('❌ 重要消息发送失败', 'error');
    }
  };

  // Test 5: Payment Reminders
  const testPaymentReminders = () => {
    const amounts = ['500', '1000', '2000', '5000'];
    const dates = ['2024年3月20日', '2024年3月25日', '2024年4月1日'];
    const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
    const randomDate = dates[Math.floor(Math.random() * dates.length)];
    
    try {
      sendPaymentReminder(randomAmount, randomDate);
      addTestResult(`✅ 付款提醒已发送: $${randomAmount}`, 'success');
    } catch (error) {
      addTestResult('❌ 付款提醒发送失败', 'error');
    }
  };

  // Test 6: Medical Appointments
  const testMedicalAppointments = () => {
    const appointments = [
      { type: '产前检查', date: '2024年3月18日', time: '上午10:00' },
      { type: '超声波检查', date: '2024年3月22日', time: '下午2:00' },
      { type: '血液检查', date: '2024年3月25日', time: '上午9:00' },
    ];
    const randomAppointment = appointments[Math.floor(Math.random() * appointments.length)];
    
    try {
      sendMedicalAppointmentReminder(randomAppointment.type, randomAppointment.date, randomAppointment.time);
      addTestResult(`✅ 医疗预约提醒已发送: ${randomAppointment.type}`, 'success');
    } catch (error) {
      addTestResult('❌ 医疗预约提醒发送失败', 'error');
    }
  };

  // Test 7: Batch Notifications
  const testBatchNotifications = () => {
    try {
      // Send multiple notifications at once
      setTimeout(() => sendStatusUpdate('submitted', 'BATCH-001'), 0);
      setTimeout(() => sendEventReminder('测试活动1', '2024年3月15日', '下午2:00'), 1000);
      setTimeout(() => sendImportantMessage('批量测试', '这是一条批量测试消息'), 2000);
      setTimeout(() => sendPaymentReminder('1000', '2024年3月20日'), 3000);
      setTimeout(() => sendMedicalAppointmentReminder('产前检查', '2024年3月18日', '上午10:00'), 4000);
      
      addTestResult('✅ 批量通知已发送 (5条通知)', 'success');
    } catch (error) {
      addTestResult('❌ 批量通知发送失败', 'error');
    }
  };

  // Test 8: Badge Count
  const testBadgeCount = () => {
    try {
      const currentCount = Math.floor(Math.random() * 10) + 1;
      NotificationService.setBadgeCount(currentCount);
      addTestResult(`✅ 徽章计数已设置为: ${currentCount}`, 'success');
    } catch (error) {
      addTestResult('❌ 徽章计数设置失败', 'error');
    }
  };

  // Test 9: Clear All
  const testClearAll = () => {
    try {
      NotificationService.cancelAllNotifications();
      NotificationService.clearBadgeCount();
      addTestResult('✅ 所有通知已清除', 'success');
    } catch (error) {
      addTestResult('❌ 清除通知失败', 'error');
    }
  };

  // Test 10: Custom Notification
  const testCustomNotification = () => {
    try {
      NotificationService.sendLocalNotification(
        '自定义测试通知',
        '这是一个自定义的通知测试，包含特殊字符和表情符号 🎉',
        { 
          type: 'custom_test',
          customData: 'test_value',
          timestamp: new Date().toISOString()
        }
      );
      addTestResult('✅ 自定义通知已发送', 'success');
    } catch (error) {
      addTestResult('❌ 自定义通知发送失败', 'error');
    }
  };

  const getResultColor = (type) => {
    switch (type) {
      case 'success': return '#28A745';
      case 'error': return '#DC3545';
      case 'warning': return '#FFC107';
      default: return '#6C757D';
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 通知测试中心</Text>
      <Text style={styles.subtitle}>测试推送通知系统的各种功能</Text>

      {/* Permission Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 权限状态</Text>
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

      {/* Test Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 通知测试</Text>
        
        <View style={styles.testGrid}>
          <TouchableOpacity style={styles.testButton} onPress={testBasicNotification}>
            <Text style={styles.testButtonText}>基本通知</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testStatusNotifications}>
            <Text style={styles.testButtonText}>状态更新</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testEventReminders}>
            <Text style={styles.testButtonText}>活动提醒</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testImportantMessages}>
            <Text style={styles.testButtonText}>重要消息</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testPaymentReminders}>
            <Text style={styles.testButtonText}>付款提醒</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testMedicalAppointments}>
            <Text style={styles.testButtonText}>医疗预约</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testBatchNotifications}>
            <Text style={styles.testButtonText}>批量通知</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testCustomNotification}>
            <Text style={styles.testButtonText}>自定义通知</Text>
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
          • 点击各种测试按钮来发送不同类型的通知{'\n'}
          • 观察设备上的通知显示效果{'\n'}
          • 检查应用图标徽章计数变化{'\n'}
          • 测试通知的点击交互{'\n'}
          • 使用"清除所有通知"来重置状态
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
