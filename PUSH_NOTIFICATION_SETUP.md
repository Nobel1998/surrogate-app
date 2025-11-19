# 推送通知系统设置指南

## 📦 需要安装的依赖包

为了使用完整的推送通知功能，需要安装以下依赖包：

```bash
# 核心推送通知包
npm install react-native-push-notification

# iOS 额外依赖
npm install @react-native-community/push-notification-ios

# 链接原生代码 (React Native < 0.60)
react-native link react-native-push-notification
react-native link @react-native-community/push-notification-ios
```

## 🔧 当前状态

目前系统使用**模拟模式**运行，这意味着：

### ✅ 已实现的功能
- 通知逻辑和状态管理
- 用户界面和设置
- 通知历史记录
- 测试页面和功能

### 🔄 模拟功能
- 通知显示为系统Alert弹窗
- 权限检查返回模拟结果
- 徽章计数在控制台显示
- 所有通知功能正常工作

## 🚀 如何启用真实推送通知

### 1. 安装依赖包
```bash
npm install react-native-push-notification @react-native-community/push-notification-ios
```

### 2. 更新 NotificationService.js
取消注释以下行：
```javascript
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
```

### 3. 配置原生代码

#### Android 配置
在 `android/app/src/main/AndroidManifest.xml` 中添加：
```xml
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

#### iOS 配置
在 `ios/YourApp/Info.plist` 中添加：
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

### 4. 重新构建应用
```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios
```

## 🧪 测试功能

即使在没有安装依赖包的情况下，你仍然可以：

1. **测试通知逻辑**: 所有通知都会显示为Alert弹窗
2. **测试用户界面**: 完整的设置和历史页面
3. **测试状态管理**: 通知的添加、删除、标记已读
4. **测试各种通知类型**: 状态更新、活动提醒、重要消息等

## 📱 当前测试方法

1. 运行应用
2. 点击底部"Test"标签页
3. 点击各种测试按钮
4. 观察Alert弹窗显示通知内容
5. 检查控制台日志输出

## 🔄 从模拟模式切换到真实模式

当安装完依赖包后，只需要：

1. 取消注释 NotificationService.js 中的导入语句
2. 重新构建应用
3. 系统将自动使用真实的推送通知功能

## 📋 功能对比

| 功能 | 模拟模式 | 真实模式 |
|------|----------|----------|
| 通知显示 | Alert弹窗 | 系统通知栏 |
| 权限管理 | 模拟权限 | 真实系统权限 |
| 徽章计数 | 控制台日志 | 应用图标徽章 |
| 通知声音 | 无 | 系统通知声音 |
| 后台通知 | 无 | 支持后台推送 |

现在你可以立即开始测试通知系统的所有功能，无需安装额外的依赖包！
