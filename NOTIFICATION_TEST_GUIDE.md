# 推送通知系统测试指南

## 📱 如何测试推送通知系统

### 1. 安装必要的依赖包

首先，你需要在项目中安装推送通知相关的依赖包：

```bash
# 安装推送通知核心包
npm install react-native-push-notification

# iOS 额外依赖
npm install @react-native-community/push-notification-ios

# 链接原生代码 (React Native < 0.60)
react-native link react-native-push-notification
react-native link @react-native-community/push-notification-ios
```

### 2. 配置权限

#### Android 配置 (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

#### iOS 配置 (ios/YourApp/Info.plist)
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

### 3. 测试步骤

#### 步骤 1: 启动应用
1. 运行你的 React Native 应用
2. 导航到通知测试页面

#### 步骤 2: 请求权限
1. 点击"请求权限"按钮
2. 在系统弹窗中允许通知权限
3. 确认权限状态显示为"已授权"

#### 步骤 3: 测试基本通知
1. 点击"基本通知"按钮
2. 观察设备顶部是否出现通知
3. 点击通知查看是否正常响应

#### 步骤 4: 测试各种通知类型
- **状态更新通知**: 测试申请状态变化通知
- **活动提醒**: 测试事件和预约提醒
- **重要消息**: 测试高优先级消息
- **付款提醒**: 测试付款截止日期提醒
- **医疗预约**: 测试医疗检查提醒

#### 步骤 5: 测试批量通知
1. 点击"批量通知"按钮
2. 观察是否连续收到5条不同类型的通知
3. 检查应用图标徽章计数是否正确

#### 步骤 6: 测试系统功能
- **徽章计数**: 测试应用图标数字徽章
- **清除通知**: 测试清除所有通知功能
- **自定义通知**: 测试特殊格式和表情符号

### 4. 预期结果

#### ✅ 成功指标
- 通知在设备顶部正确显示
- 通知内容准确无误
- 点击通知能正确响应
- 应用图标徽章计数正确更新
- 不同通知类型有视觉区分

#### ❌ 常见问题
- **通知不显示**: 检查权限设置
- **通知无声音**: 检查设备静音模式
- **徽章不更新**: 检查应用设置
- **点击无响应**: 检查通知处理器

### 5. 测试场景

#### 场景 1: 新用户注册
1. 用户注册账户
2. 系统发送欢迎通知
3. 验证通知内容和时间

#### 场景 2: 申请状态更新
1. 用户提交申请
2. 系统发送提交确认通知
3. 申请审核通过后发送批准通知
4. 验证状态变化通知的准确性

#### 场景 3: 活动提醒
1. 设置一个未来时间的活动
2. 系统在活动前发送提醒
3. 验证提醒时间和内容

#### 场景 4: 重要消息推送
1. 发送紧急通知
2. 验证高优先级显示
3. 测试用户响应

### 6. 调试技巧

#### 查看日志
```javascript
// 在 NotificationService.js 中添加日志
console.log('Notification sent:', notification);
console.log('Permissions:', permissions);
```

#### 检查权限状态
```javascript
// 在测试页面中检查权限
const checkPermissions = async () => {
  const perms = await NotificationService.checkNotificationPermissions();
  console.log('Current permissions:', perms);
};
```

#### 测试不同设备
- **Android**: 测试不同版本和厂商
- **iOS**: 测试不同版本和设备型号
- **模拟器**: 验证基本功能
- **真机**: 验证完整功能

### 7. 性能测试

#### 批量通知测试
1. 连续发送100条通知
2. 观察应用性能
3. 检查内存使用情况

#### 长时间运行测试
1. 应用运行24小时
2. 定期发送通知
3. 检查系统稳定性

### 8. 用户验收测试

#### 测试清单
- [ ] 通知权限请求正常
- [ ] 基本通知显示正确
- [ ] 状态更新通知准确
- [ ] 活动提醒及时
- [ ] 重要消息优先级正确
- [ ] 付款提醒功能正常
- [ ] 医疗预约提醒准确
- [ ] 徽章计数正确
- [ ] 通知点击响应正常
- [ ] 清除功能工作正常

#### 用户体验测试
- [ ] 通知内容清晰易懂
- [ ] 通知时间合理
- [ ] 不会过度打扰用户
- [ ] 用户能轻松管理通知设置

### 9. 故障排除

#### 常见问题解决
1. **权限被拒绝**: 引导用户到设置中手动开启
2. **通知延迟**: 检查系统电池优化设置
3. **通知重复**: 检查通知ID设置
4. **样式问题**: 检查通知渠道配置

#### 联系支持
如果遇到技术问题，请检查：
1. 依赖包版本兼容性
2. 原生代码配置
3. 权限设置
4. 设备系统版本
