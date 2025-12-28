# 调试代母流程更新通知

## 📱 如何查看控制台日志

### 方法 1: Metro Bundler 终端（推荐）
1. 启动应用时，会打开一个终端窗口运行 Metro bundler
2. 所有 `console.log()` 会显示在这个终端窗口
3. 查找包含 `[HomeScreen]` 的日志

### 方法 2: Expo 开发工具
- 在运行 `npm start` 或 `expo start` 的终端查看
- 或者按 `j` 键打开调试器

### 方法 3: React Native Debugger
- 摇动设备或按 `Cmd+D` (iOS) / `Cmd+M` (Android)
- 选择 "Debug" 或 "Debug Remote JS"
- 在浏览器控制台查看日志

## 🔍 关键日志信息

### 成功设置监听器
```
[HomeScreen] Setting up listener for surrogate progress: {surrogate_id}
[HomeScreen] Realtime subscription status: SUBSCRIBED
```

### 检测到阶段变化
```
[HomeScreen] ✅ Surrogate profile updated via Realtime: {...}
[HomeScreen] ✅ Stage changed detected! Sending notification: {oldStage, newStage}
[HomeScreen] ✅ Notification sent successfully
```

### 使用轮询备选方案
```
[HomeScreen] ⚠️ Realtime not available, falling back to polling
[HomeScreen] ✅ Stage changed detected via polling! Sending notification
```

### 错误信息
```
[HomeScreen] ❌ Realtime channel error
[HomeScreen] ❌ Error sending notification: ...
```

## 🐛 常见问题排查

### 1. 没有看到任何日志
- ✅ 确保应用正在运行
- ✅ 确保你是 parent 用户（不是 surrogate）
- ✅ 确保你已经匹配了代母（matchedSurrogateId 不为空）
- ✅ 检查终端窗口是否打开

### 2. 看到 "Realtime not available"
- ✅ 运行 SQL 迁移启用 Realtime：
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  ```
- ✅ 代码会自动使用轮询备选方案（每10秒检查一次）

### 3. 看到 "Stage changed detected" 但没有通知
- ✅ 检查 NotificationContext 是否正确初始化
- ✅ 检查通知权限是否已授予
- ✅ 查看是否有错误日志

### 4. 测试步骤
1. 以 parent 用户身份登录
2. 确保已匹配代母
3. 查看控制台是否有 "Setting up listener" 日志
4. 在后台更新代母的阶段
5. 观察控制台是否有 "Stage changed detected" 日志
6. 检查是否收到通知

## 📝 手动测试通知

如果 Realtime 和轮询都不工作，可以手动测试通知功能：

在 HomeScreen 中添加测试按钮（临时）：
```javascript
// 测试通知
const testNotification = () => {
  sendSurrogateProgressUpdate(
    'Test Surrogate',
    'pre',
    'pregnancy',
    {
      'pre': 'Pre-Transfer',
      'pregnancy': 'Post-Transfer',
      'ob_visit': 'OB Office Visit',
      'delivery': 'Delivery',
    }
  );
};
```

## 🔧 启用 Realtime（必需）

在 Supabase Dashboard > SQL Editor 中运行：

```sql
-- Enable Realtime replication for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

然后验证：
1. 进入 Database > Replication
2. 确认 `profiles` 表在列表中

